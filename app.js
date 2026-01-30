// app.js
// Pharmazephyr 2026 - Full frontend logic (FINAL PATCHED + STABLE):
// ✅ Mobile nav
// ✅ Welcome animation
// ✅ Hero title animation (2-line forced)
// ✅ Reveal on scroll
// ✅ Counters (events/days animated)
// ✅ Participants metric (real Firestore count, animated)
// ✅ Firestore registration with serial regId: PZ26-OCP-000231
// ✅ Ticket QR window: show QR if registered else show "Don't Miss Out"
// ✅ Styled QR via QRCodeStyling
// ✅ Theme toasts
// ✅ anime.js loading overlay
// ✅ Pass modal: BIG premium QR + copy regId + download PNG
// ✅ localStorage persistence: refresh keeps pass visible
// ✅ Clear pass button
// ✅ Google Auth pipeline required before registration
// ✅ Email forced from Google (prevents mismatch/fake)
// ✅ FIXED: no duplicate function declarations
// ✅ FIXED: ID mismatch (single consistent IDs)


import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  limit,
  getDocs,
  collection,
  runTransaction,
  serverTimestamp,
  getCountFromServer,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";



// ----------------------------
// Firebase init
// ----------------------------


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Auth
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// ----------------------------
// Global state
// ----------------------------
let __lastRegistrationPayload = null;

// ----------------------------
// DOM helpers
// ----------------------------
function qs(sel) {
  return document.querySelector(sel);
}
function qsa(sel) {
  return Array.from(document.querySelectorAll(sel));
}

// ----------------------------
// General helpers
// ----------------------------
function setRegisterCTAsVisible(isVisible) {
  // topbar register
  const topRegister = qs("#btnTopRegister") || qs("#registerBtnTop");
  if (topRegister) topRegister.style.display = isVisible ? "inline-flex" : "none";

  // hero register
  const heroRegister = qs("#heroRegisterBtn");
  if (heroRegister) heroRegister.style.display = isVisible ? "inline-flex" : "none";
}


function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}
function cleanPhone(phone) {
  return (phone || "").trim().replace(/[^\d+]/g, "");
}
function formatRegId(prefix, serial) {
  const padded = String(serial).padStart(6, "0");
  return `${prefix}-${padded}`;
}

// ----------------------------
// Registration Modal (SINGLE DECLARATION - FIXED)
// ----------------------------
function openRegModal() {
  const modal = qs("#regModal");
  if (!modal) return;

  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");

  const card = modal.querySelector(".reg-modal-card");
  if (card) {
    anime.remove(card);
    anime({
      targets: card,
      opacity: [0, 1],
      translateY: [16, 0],
      scale: [0.985, 1],
      duration: 420,
      easing: "easeOutExpo",
    });
  }

  document.body.style.overflow = "hidden";
}

function closeRegModal() {
  const modal = qs("#regModal");
  if (!modal) return;

  const card = modal.querySelector(".reg-modal-card");

  anime.remove(card);
  anime({
    targets: card,
    opacity: [1, 0],
    translateY: [0, 12],
    scale: [1, 0.99],
    duration: 220,
    easing: "easeInOutQuad",
    complete: () => {
      modal.classList.remove("show");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    },
  });
}

function setupRegModalClose() {
  const modal = qs("#regModal");
  if (!modal) return;

  modal.querySelectorAll("[data-reg-close]").forEach((el) => {
    el.addEventListener("click", closeRegModal);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("show")) closeRegModal();
  });
}

// ----------------------------
// Local storage persistence
// ----------------------------


const LS_KEY = "PZ26_REGISTRATION_V1";

function saveLocalRegistration(regData) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(regData));
  } catch (e) {
    console.warn("localStorage save failed:", e);
  }
}

function loadLocalRegistration() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("localStorage load failed:", e);
    return null;
  }
}

function clearLocalRegistration() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch (e) {
    console.warn("localStorage remove failed:", e);
  }
}

async function hydrateRegistrationFromLocal() {
  const local = loadLocalRegistration();
  if (!local || !local.regId) {
    updateTicketUI(null);
    return;
  }

  // show instantly (fast UX)
  updateTicketUI(local);

  // verify truth source
  try {
    const regRef = doc(db, "registrations", local.regId);
    const snap = await getDoc(regRef);

    if (!snap.exists()) {
      // 🔥 IMPORTANT: if deleted in DB -> wipe local completely
      clearLocalRegistration();
      __lastRegistrationPayload = null;
      updateTicketUI(null);

      toast("info", "Pass invalid", "This pass was removed or expired. Please register again.");
      return;
    }

    const fresh = snap.data();
    updateTicketUI(fresh);
  } catch (e) {
    console.warn("Firestore verify failed:", e);
    // If offline: keep pass visible (ok)
  }
}

// ----------------------------
// Loading overlay
// ----------------------------
function showLoading(title = "Processing…", sub = "Please wait") {
  const loading = qs("#loading");
  if (!loading) return;

  const titleEl = loading.querySelector(".loading-title");
  const subEl = loading.querySelector(".loading-sub");

  if (titleEl) titleEl.textContent = title;
  if (subEl) subEl.textContent = sub;

  loading.classList.add("show");
  loading.setAttribute("aria-hidden", "false");

  const ring = loading.querySelector(".loading-ring");
  if (ring) {
    anime.remove(ring);

    anime({
      targets: ring,
      rotate: [0, 360],
      duration: 900,
      easing: "linear",
      loop: true,
    });

    anime({
      targets: ring,
      scale: [1, 1.06, 1],
      duration: 1200,
      easing: "easeInOutSine",
      loop: true,
    });
  }

  anime.remove(loading);
  anime({
    targets: loading,
    opacity: [0, 1],
    duration: 220,
    easing: "easeOutQuad",
  });

  document.body.style.overflow = "hidden";
}

function hideLoading() {
  const loading = qs("#loading");
  if (!loading) return;

  anime.remove(loading);
  anime({
    targets: loading,
    opacity: [1, 0],
    duration: 220,
    easing: "easeInOutQuad",
    complete: () => {
      loading.classList.remove("show");
      loading.setAttribute("aria-hidden", "true");
      loading.style.opacity = "";
      document.body.style.overflow = "";
    },
  });
}

// ----------------------------
// Toast UI
// ----------------------------
function toast(type, title, msg) {
  const wrap = qs("#toastWrap");
  if (!wrap) return;

  const icons = {
    success: `
      <svg viewBox="0 0 24 24"><path d="M9.2 16.6 4.9 12.3l1.4-1.4 2.9 2.9 8-8 1.4 1.4-9.4 9.4z"/></svg>
    `,
    error: `
      <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 14h-2v-2h2v2zm0-4h-2V6h2v6z"/></svg>
    `,
    info: `
      <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
    `,
  };

  const el = document.createElement("div");
  el.className = `toast toast--${type || "info"}`;

  el.innerHTML = `
    <div class="toast-row">
      <div class="toast-ico">${icons[type] || icons.info}</div>
      <div>
        <div class="toast-title">${title || "Notice"}</div>
        ${msg ? `<div class="toast-msg">${msg}</div>` : ""}
      </div>
      <div class="toast-actions">
        <button class="toast-close toast-ok" aria-label="Close">OK</button>
      </div>
    </div>
  `;

  wrap.prepend(el);

  const closeBtn = el.querySelector(".toast-close");
  const kill = () => {
    anime.remove(el);
    anime({
      targets: el,
      opacity: [1, 0],
      translateY: [0, -8],
      duration: 220,
      easing: "easeInOutQuad",
      complete: () => el.remove(),
    });
  };

  closeBtn?.addEventListener("click", kill);

  anime({
    targets: el,
    opacity: [0, 1],
    translateY: [-10, 0],
    duration: 360,
    easing: "easeOutExpo",
  });

  setTimeout(kill, 1800);
}

// ----------------------------
// Auth pipeline
// ----------------------------
async function ensureSignedIn() {
  const user = auth.currentUser;
  if (user) return user;

  toast("info", "Google Sign-in required", "Please sign in to register.");
  try {
    const res = await signInWithPopup(auth, googleProvider);
    toast("success", "Signed in", res.user.email || "Google account connected");
    return res.user;
  } catch (err) {
    console.error(err);
    throw new Error("Sign-in cancelled or blocked.");
  }
}

async function doSignOut() {
  try {
    await signOut(auth);
    toast("info", "Signed out", "You are now logged out.");
  } catch (err) {
    console.error(err);
    toast("error", "Sign out failed", err?.message || "Unknown error");
  }
}

function setTopbarAuthState(isAuthed) {
  // ✅ SINGLE consistent IDs
  const btnLogout = qs("#btnLogout");
  const btnGoogle = qs("#btnGoogle");
  const btnRegisterTop = qs("#btnTopRegister");

  if (!btnLogout || !btnGoogle || !btnRegisterTop) {
    console.warn("Topbar auth elements missing:", {
      btnLogout,
      btnGoogle,
      btnRegisterTop,
    });
    return;
  }

  if (isAuthed) {
    btnLogout.style.display = "inline-flex";
    btnGoogle.style.display = "none";
    btnRegisterTop.style.display = "inline-flex";
  } else {
    btnLogout.style.display = "none";
    btnGoogle.style.display = "inline-flex";
    btnRegisterTop.style.display = "none";
  }
}

// Sync ALL email inputs
function syncAllEmailInputs(email) {
  const emailInputs = qsa("input[type='email']");
  emailInputs.forEach((el) => {
    if (email) {
      el.value = email;
      el.setAttribute("readonly", "true");
    } else {
      el.value = "";
      el.removeAttribute("readonly");
    }
  });
}

// ----------------------------
// Metric animation helpers
// ----------------------------
function animateCountTo(el, end) {
  const durationMs = 900;
  const t0 = performance.now();

  const tick = (t) => {
    const p = Math.min(1, (t - t0) / durationMs);
    const eased = 1 - Math.pow(1 - p, 3);
    const val = Math.floor(end * eased);
    el.textContent = String(val);
    if (p < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

async function hydrateParticipantsMetric() {
  const metrics = Array.from(document.querySelectorAll(".metric"));

  const participantsMetric = metrics.find((m) => {
    const label = m.querySelector(".metric-label");
    return label && label.textContent.trim().toLowerCase() === "participants";
  });

  if (!participantsMetric) return;

  const numEl = participantsMetric.querySelector(".metric-num");
  if (!numEl) return;

  numEl.textContent = "0";

  try {
    const regCol = collection(db, "registrations");
    const snap = await getCountFromServer(regCol);
    const realCount = snap.data().count;
    animateCountTo(numEl, realCount);
  } catch (err) {
    console.error("Participants count fetch failed:", err);
    numEl.textContent = "—";
  }
}

// ----------------------------
// Ticket QR helpers
// ----------------------------
function setTicketQrEmpty(message) {
  const qrBox = qs(".ticket-qr");
  if (!qrBox) return;

  qrBox.classList.remove("has-qr");

  let empty = qrBox.querySelector(".qr-empty");
  if (!empty) {
    empty = document.createElement("div");
    empty.className = "qr-empty";
    qrBox.appendChild(empty);
  }

  empty.style.display = "";
  empty.textContent = message || "Don't Miss Out";

  const oldCanvas = qrBox.querySelector("canvas");
  if (oldCanvas) oldCanvas.remove();

  const oldImg = qrBox.querySelector("img");
  if (oldImg) oldImg.remove();

  const holder = qrBox.querySelector(".qr-holder");
  if (holder) holder.remove();
}

function setTicketQrImage(qrDataText) {
  const qrBox = qs(".ticket-qr");
  if (!qrBox) return;

  if (typeof QRCodeStyling !== "function") {
    toast("error", "QR dependency missing", "QRCodeStyling not loaded.");
    return;
  }

  qrBox.classList.add("has-qr");

  const empty = qrBox.querySelector(".qr-empty");
  if (empty) empty.style.display = "none";

  const oldCanvas = qrBox.querySelector("canvas");
  if (oldCanvas) oldCanvas.remove();

  const oldImg = qrBox.querySelector("img");
  if (oldImg) oldImg.remove();

  let holder = qrBox.querySelector(".qr-holder");
  if (!holder) {
    holder = document.createElement("div");
    holder.className = "qr-holder";
    qrBox.appendChild(holder);
  }
  holder.innerHTML = "";

  const qr = new QRCodeStyling({
    width: 220,
    height: 220,
    type: "canvas",
    data: qrDataText,
    margin: 0,
    qrOptions: { errorCorrectionLevel: "H" },

    dotsOptions: {
      type: "rounded",
      gradient: {
        type: "linear",
        rotation: Math.PI / 4,
        colorStops: [
          { offset: 0, color: "#ff4fd8" },
          { offset: 1, color: "#b76bff" },
        ],
      },
    },

    cornersSquareOptions: { type: "extra-rounded", color: "#f3e9ff" },
    cornersDotOptions: { type: "dot", color: "#ff4fd8" },

    backgroundOptions: { color: "rgba(0,0,0,0)" },

    image: "assets/logo.jpg",
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.34,
      margin: 4,
      crossOrigin: "anonymous",
    },
  });

  qr.append(holder);
}

// ----------------------------
// Firestore logic
// ----------------------------
async function getExistingRegistrationByEmail(email) {
  const emailNorm = normalizeEmail(email);
  if (!emailNorm) return null;

  const regCol = collection(db, "registrations");
  const q = query(regCol, where("email", "==", emailNorm), limit(1));
  const snap = await getDocs(q);

  if (snap.empty) return null;

  return snap.docs[0].data();
}

async function createRegistrationWithSerial(fields) {
  const counterRef = doc(db, "counters", "registrations");

  const result = await runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef);

    if (!counterSnap.exists()) {
      throw new Error("Missing counter doc: counters/registrations");
    }

    const counter = counterSnap.data();
    const prefix = counter.prefix || "PZ26-OCP";
    const nextSerial = Number(counter.nextSerial || 1);

    const regId = formatRegId(prefix, nextSerial);
    const regRef = doc(db, "registrations", regId);

    const regSnap = await tx.get(regRef);
    if (regSnap.exists()) throw new Error("regId collision. Counter out of sync.");

    const emailNorm = normalizeEmail(fields.email);
    const qrText = `PZ26|${regId}|${emailNorm}`;

    // keep your fields EXACT + auth bind
    const payload = {
      college: fields.college,
      email: emailNorm,
      fullName: fields.fullName,
      phone: fields.phone,
      qrText,
      regId,
      createdAt: serverTimestamp(),
      serial: nextSerial,

      uid: fields.uid,
      authProvider: "google",
    };

    tx.set(regRef, payload);
    tx.update(counterRef, { nextSerial: nextSerial + 1 });

    return payload;
  });

  return result;
}

// ----------------------------
// Ticket UI binding
// ----------------------------
function updateTicketUI(regData) {
  const ticket = qs(".ticket");

  if (!regData) {
    __lastRegistrationPayload = null;
    clearLocalRegistration();
    setTicketQrEmpty("Don't Miss Out");
    ticket?.classList.remove("has-pass");

    setRegisterCTAsVisible(true); 
    return;
  }

  __lastRegistrationPayload = regData;
  saveLocalRegistration(regData);

  setTicketQrImage(regData.qrText);
  ticket?.classList.add("has-pass");

  setRegisterCTAsVisible(false);   
}


// ----------------------------
// Pass modal pipeline
// ----------------------------
function openPassModal(regData) {
  const modal = qs("#passModal");
  if (!modal) return;

  const regEl = qs("#passRegId");
  const nameEl = qs("#passName");
  const collegeEl = qs("#passCollege");
  const passQr = qs("#passQr");

  if (regEl) regEl.textContent = regData?.regId || "—";
  if (nameEl) nameEl.textContent = regData?.fullName || "—";
  if (collegeEl) collegeEl.textContent = regData?.college || "—";
  if (passQr) passQr.innerHTML = "";

  if (typeof QRCodeStyling !== "function") {
    toast("error", "QR dependency missing", "QRCodeStyling not loaded.");
    return;
  }

  const qr = new QRCodeStyling({
    width: 520,
    height: 520,
    type: "canvas",
    data: regData.qrText,
    margin: 0,
    qrOptions: { errorCorrectionLevel: "H" },
    dotsOptions: {
      type: "rounded",
      gradient: {
        type: "linear",
        rotation: Math.PI / 4,
        colorStops: [
          { offset: 0, color: "#ff4fd8" },
          { offset: 1, color: "#b76bff" },
        ],
      },
    },
    cornersSquareOptions: { type: "extra-rounded", color: "#f3e9ff" },
    cornersDotOptions: { type: "dot", color: "#ff4fd8" },
    backgroundOptions: { color: "rgba(0,0,0,0)" },
    image: "assets/logo.jpg",
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: 0.34,
      margin: 6,
      crossOrigin: "anonymous",
    },
  });

  qr.append(passQr);

  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");

  const card = modal.querySelector(".pass-card");
  if (card) {
    anime.remove(card);
    anime({
      targets: card,
      opacity: [0, 1],
      translateY: [16, 0],
      scale: [0.985, 1],
      duration: 420,
      easing: "easeOutExpo",
    });
  }

  document.body.style.overflow = "hidden";
}

function closePassModal() {
  const modal = qs("#passModal");
  if (!modal) return;

  const card = modal.querySelector(".pass-card");

  anime.remove(card);
  anime({
    targets: card,
    opacity: [1, 0],
    translateY: [0, 10],
    duration: 220,
    easing: "easeInOutQuad",
    complete: () => {
      modal.classList.remove("show");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    },
  });
}

function downloadPassAsPNG() {
  const modal = qs("#passModal");
  const card = modal?.querySelector(".pass-card");
  if (!card) return;

  if (typeof html2canvas !== "function") {
    toast("error", "Missing dependency", "html2canvas not loaded.");
    return;
  }

  html2canvas(card, { backgroundColor: null, scale: 2 }).then((canvas) => {
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${__lastRegistrationPayload?.regId || "PZ26-PASS"}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast("success", "Downloaded", "Pass saved as PNG.");
  });
}


function setupPassModal() {
  const modal = qs("#passModal");
  if (!modal) return;

  const ticketQr = qs(".ticket-qr");
  ticketQr?.addEventListener("click", () => {
    if (!__lastRegistrationPayload) {
      toast("info", "No registration found", "Register first to generate your official pass.");
      return;
    }
    openPassModal(__lastRegistrationPayload);
  });

  modal.querySelectorAll("[data-pass-close]").forEach((el) => {
    el.addEventListener("click", closePassModal);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("show")) closePassModal();
  });

  const copyBtn = qs("#copyRegBtn");
  copyBtn?.addEventListener("click", async () => {
    if (!__lastRegistrationPayload?.regId) return;

    try {
      await navigator.clipboard.writeText(__lastRegistrationPayload.regId);
      toast("success", "Copied", "Reg ID copied to clipboard.");
    } catch {
      toast("error", "Copy failed", "Your browser blocked clipboard access.");
    }
  });

  const dlBtn = qs("#downloadPassBtn");
  dlBtn?.addEventListener("click", () => downloadPassAsPNG());
}

// ----------------------------
// Registration submit (both bottom + modal)
// ----------------------------
function setupRegistrationSubmit() {
  const forms = qsa("form.form");

  forms.forEach((form) => {
    const fullNameEl = form.querySelector("input[placeholder='Your name']");
    const phoneEl = form.querySelector("input[type='tel']");
    const emailEl = form.querySelector("input[type='email']");
    const collegeEl = form.querySelector("input[placeholder='Your college name']");
    const submitBtn = form.querySelector("button.btn-primary");

    if (!fullNameEl || !phoneEl || !emailEl || !collegeEl || !submitBtn) return;

    submitBtn.addEventListener("click", async () => {
      const oldText = submitBtn.textContent;

      try {
        // auth required
        const user = await ensureSignedIn();

        // force email (prevent mismatch)
        syncAllEmailInputs(user.email || "");

        const fullName = (fullNameEl.value || "").trim();
        const phone = cleanPhone(phoneEl.value || "");
        const college = (collegeEl.value || "").trim();
        const email = normalizeEmail(user.email || "");

        if (!fullName || !phone || !email || !college) {
          toast("error", "Missing details", "Fill all fields to register.");
          return;
        }

        submitBtn.disabled = true;
        
        submitBtn.textContent = "Registering...";

        showLoading("Processing registration…", "Creating your pass + QR");

        const existing = await getExistingRegistrationByEmail(email);
        if (existing) {
          updateTicketUI(existing);
          toast("info", "Already registered", `Your ID: ${existing.regId}`);

          hideLoading();
          submitBtn.textContent = oldText;
          submitBtn.disabled = false;

          if (form.classList.contains("reg-form-modal")) closeRegModal();
          return;
        }

        const reg = await createRegistrationWithSerial({
          fullName,
          phone,
          email,
          college,
          uid: user.uid,
        });

        updateTicketUI(reg);
        toast("success", "Registered successfully", `Your ID: ${reg.regId}`);

        hideLoading();
        submitBtn.textContent = oldText;
        submitBtn.disabled = false;

        // refresh participants metric instantly
        hydrateParticipantsMetric();

        if (form.classList.contains("reg-form-modal")) closeRegModal();
      } catch (err) {
        console.error(err);
        hideLoading();
        toast("error", "Registration failed", err?.message || "Unknown error");
        submitBtn.disabled = false;
        submitBtn.textContent = oldText;
      }
    });
  });
}

// ----------------------------
// UI + animations
// ----------------------------
function animateHeroTitleTwoLines() {
  const line1 = document.querySelector(".hero-line-1");
  const line2 = document.querySelector(".hero-line-2");
  if (!line1 || !line2) return;
  if (line1.querySelector(".char") || line2.querySelector(".char")) return;

  function splitIntoChars(el) {
    const text = el.textContent.trim();
    el.textContent = "";
    for (const ch of text) {
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = ch === " " ? "\u00A0" : ch;
      el.appendChild(span);
    }
  }

  splitIntoChars(line1);
  splitIntoChars(line2);

  anime({
    targets: ".hero-title .char",
    translateY: [18, 0],
    opacity: [0, 1],
    easing: "easeOutExpo",
    duration: 900,
    delay: anime.stagger(18),
  });
}

function animateOnView(selector, animeProps) {
  const els = document.querySelectorAll(selector);
  const seen = new WeakSet();

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        if (seen.has(e.target)) return;
        seen.add(e.target);
        anime({ targets: e.target, ...animeProps });
      });
    },
    { threshold: 0.25 }
  );

  els.forEach((el) => io.observe(el));
}

function animateNeonCTA() {
  const cta = document.querySelector(".btn-primary");
  if (!cta) return;

  anime({
    targets: cta,
    boxShadow: [
      "0 18px 40px rgba(255,79,216,.18)",
      "0 24px 65px rgba(255,79,216,.35)",
    ],
    duration: 1200,
    easing: "easeInOutSine",
    direction: "alternate",
    loop: true,
  });
}

function runWelcomeAnimation() {
  const welcome = document.getElementById("welcome");
  if (!welcome) return;

  document.body.style.overflow = "hidden";

  const inner = welcome.querySelector(".welcome-inner");
  const seal = welcome.querySelector(".welcome-seal");
  const ring = welcome.querySelector(".seal-ring");
  const flash = welcome.querySelector(".seal-flash");
  const lines = welcome.querySelector(".welcome-lines");
  const college = welcome.querySelector(".welcome-college");
  const tag = welcome.querySelector(".welcome-tag");
  const hint = welcome.querySelector(".welcome-hint");

  anime.set(inner, { opacity: 0, scale: 0.985 });
  anime.set([seal, college, tag, hint], { opacity: 0, translateY: 10 });
  anime.set(lines, { opacity: 0 });
  anime.set(flash, { opacity: 0, scale: 0.9 });

  const tl = anime.timeline({ easing: "easeOutExpo", autoplay: true });

  tl.add({ targets: inner, opacity: [0, 1], scale: [0.985, 1], duration: 460 });

  tl.add(
    { targets: lines, opacity: [0, 0.28], duration: 480, easing: "easeInOutSine" },
    "-=180"
  );

  tl.add(
    {
      targets: seal,
      opacity: [0, 1],
      translateY: [18, 0],
      scale: [0.9, 1],
      duration: 520,
      easing: "easeOutBack",
    },
    "-=360"
  );

  tl.add(
    {
      targets: flash,
      opacity: [0, 0.9, 0],
      scale: [0.9, 1.18, 1.35],
      duration: 520,
      easing: "easeOutQuad",
    },
    "-=420"
  );

  tl.add(
    { targets: ring, rotate: [0, 360], duration: 1100, easing: "easeInOutSine" },
    "-=560"
  );

  tl.add(
    {
      targets: college,
      opacity: [0, 1],
      translateY: [10, 0],
      duration: 520,
      easing: "easeOutQuad",
    },
    "-=820"
  );

  tl.add(
    {
      targets: [tag, hint],
      opacity: [0, 1],
      translateY: [10, 0],
      duration: 420,
      delay: anime.stagger(120),
    },
    "-=520"
  );

  anime({
    targets: ring,
    boxShadow: [
      "0 0 0 8px rgba(255,255,255,.02), 0 0 40px rgba(255,79,216,.12)",
      "0 0 0 8px rgba(255,255,255,.02), 0 0 70px rgba(255,79,216,.22)",
    ],
    duration: 1200,
    easing: "easeInOutSine",
    direction: "alternate",
    loop: true,
  });

  let dismissed = false;

  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;

    welcome.removeEventListener("click", dismiss);
    window.removeEventListener("keydown", dismiss);

    anime({
      targets: welcome,
      opacity: [1, 0],
      duration: 420,
      easing: "easeInOutQuad",
      complete: () => {
        welcome.remove();
        document.body.style.overflow = "";
      },
    });
  };

  setTimeout(dismiss, 1600);
  welcome.addEventListener("click", dismiss);
  window.addEventListener("keydown", dismiss);
}

function setupRevealObserver() {
  const revealTargets = document.querySelectorAll(
    ".card, .tl-card, .royal-card, .metric, .section-head"
  );

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("reveal", "show");
        io.unobserve(e.target);
      }
    },
    { threshold: 0.12 }
  );

  revealTargets.forEach((el) => {
    el.classList.add("reveal");
    io.observe(el);
  });
}

function setupScrollSpotlight() {
  const spotlight = document.querySelector(".scroll-spotlight");
  if (!spotlight) return;

  const targets = document.querySelectorAll(".spot-target");
  if (!targets.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;

        const r = e.target.getBoundingClientRect();
        const x = (r.left + r.width / 2) / window.innerWidth;
        const y = (r.top + r.height / 2) / window.innerHeight;

        spotlight.style.setProperty("--sx", `${Math.round(x * 100)}%`);
        spotlight.style.setProperty("--sy", `${Math.round(y * 100)}%`);
      });
    },
    { threshold: 0.6 }
  );

  targets.forEach((t) => io.observe(t));
}

// ----------------------------
// Top buttons behavior (your spec)
// ----------------------------
function setupTopbarButtons() {
  const btnGoogle = qs("#btnGoogle");
  const btnLogout = qs("#btnLogout");
  const btnTopRegister = qs("#btnTopRegister");
  const heroRegisterBtn = qs("#heroRegisterBtn");

  btnGoogle?.addEventListener("click", async () => {
    showLoading("Signing in…", "Google Authentication");
    try {
      await ensureSignedIn();
    } catch (e) {
      toast("error", "Sign-in failed", e?.message || "Sign-in cancelled.");
    } finally {
      hideLoading(); // ✅ always runs
    }
  });


  btnLogout?.addEventListener("click", async () => {
    showLoading("Signing out…", "Please wait");
    await doSignOut();
    hideLoading();
  });

  btnTopRegister?.addEventListener("click", () => {
    openRegModal();
  });

  heroRegisterBtn?.addEventListener("click", async (e) => {
    e.preventDefault();

    if (!auth.currentUser) {
      showLoading("Signing in…", "Google Authentication");
      try {
        await ensureSignedIn();
      } catch (err) {
        toast("error", "Sign-in failed", err?.message || "Sign-in cancelled.");
        return;
      } finally {
        hideLoading(); // ✅ always runs
      }
    }

    openRegModal();
  });

}

// ----------------------------
// Main IIFE
// ----------------------------
(async function () {

  function setupScrollToTop() {
  const btn = qs("#scrollTopBtn");
  if (!btn) return;

  const toggle = () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    if (y > 260) btn.classList.add("show");
    else btn.classList.remove("show");
  };

  window.addEventListener("scroll", toggle, { passive: true });
  toggle();

  btn.addEventListener("click", () => {
    // instant top
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

setupScrollToTop();

  // Mobile nav
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const mobileNav = document.getElementById("mobileNav");
  hamburgerBtn?.addEventListener("click", () => mobileNav.classList.toggle("show"));
  mobileNav?.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => mobileNav.classList.remove("show"))
  );

  // Startup
  runWelcomeAnimation();
  animateHeroTitleTwoLines();
  animateNeonCTA();

  setupRevealObserver();
  setupScrollSpotlight();
  setupRegModalClose();
  setupPassModal();
  setupTopbarButtons();
  setupRegistrationSubmit();

  await hydrateRegistrationFromLocal();
  hydrateParticipantsMetric();

  // Events/days counters only
  const counters = document.querySelectorAll("[data-count]");
  const counterSeen = new WeakSet();
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        if (counterSeen.has(e.target)) return;
        counterSeen.add(e.target);

        const metric = e.target.closest(".metric");
        const label = metric?.querySelector(".metric-label")?.textContent?.trim()?.toLowerCase();
        if (label === "participants") return;

        const end = Number(e.target.getAttribute("data-count")) || 0;
        animateCountTo(e.target, end);
      });
    },
    { threshold: 0.55 }
  );
  counters.forEach((el) => counterObserver.observe(el));

async function checkIfUserRegistered(user) {
  if (!user?.email) return false;

  try {
    const existing = await getExistingRegistrationByEmail(user.email);
    return !!existing;
  } catch (e) {
    console.warn("Registration check failed:", e);
    return false;
  }
}

async function applyAuthAndRegistrationUI(user) {
  // 1) Auth UI (google/logout/register visibility baseline)
  setTopbarAuthState(!!user);
  syncAllEmailInputs(user?.email || "");

  // If not signed in -> register CTAs should be hidden anyway
  if (!user) {
    setRegisterCTAsVisible(false);
    return;
  }

  // 2) Registration-aware UI
  const isRegistered = await checkIfUserRegistered(user);

  // If registered -> hide register CTAs
  setRegisterCTAsVisible(!isRegistered);

  // If registered -> ensure pass is hydrated (fast UX)
  if (isRegistered) {
    // If we already have local pass loaded, don't force UI flicker.
    // But if ticket empty, pull from firestore quickly.
    if (!__lastRegistrationPayload?.regId) {
      try {
        const reg = await getExistingRegistrationByEmail(user.email);
        if (reg) updateTicketUI(reg);
      } catch (e) {
        console.warn("Auto-hydrate pass failed:", e);
      }
    }
  }
}

// Auth watcher (FIXED)
onAuthStateChanged(auth, async (user) => {
  await applyAuthAndRegistrationUI(user);
});


  animateOnView(".card", {
    translateY: [18, 0],
    opacity: [0, 1],
    duration: 800,
    easing: "easeOutExpo",
    delay: anime.stagger(120),
  });

  animateOnView(".tl-card", {
    translateX: [18, 0],
    opacity: [0, 1],
    duration: 800,
    easing: "easeOutExpo",
    delay: anime.stagger(120),
  });
})();

// ----------------------------
// IMPORTANT: one-time counter setup helper (optional)
// ----------------------------
window.__setupCounterDoc = async function () {
  const ref = doc(db, "counters", "registrations");
  const snap = await getDoc(ref);

  if (snap.exists()) {
    console.log("Counter already exists:", snap.data());
    return;
  }

  await setDoc(ref, {
    nextSerial: 1,
    prefix: "PZ26-OCP",
  });

  console.log("Created counters/registrations counter doc");
};

// Debug hook
window.__pzSignOut = doSignOut;
