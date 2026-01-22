(function () {

  function setupScrollSpotlightSnap(){
  const spot = document.querySelector(".scroll-spotlight");
  if (!spot) return;

  const targets = Array.from(document.querySelectorAll(".spot-target"));
  if (!targets.length) return;

  let rafId = null;

  // current spotlight position (in %)
  const pos = { x: 50, y: 22 };
  const targetPos = { x: 50, y: 22 };

  // smooth animation loop
  const tick = () => {
    rafId = null;

    // smooth follow (lerp)
    pos.x += (targetPos.x - pos.x) * 0.12;
    pos.y += (targetPos.y - pos.y) * 0.12;

    spot.style.setProperty("--sx", `${pos.x}%`);
    spot.style.setProperty("--sy", `${pos.y}%`);
  };

  const requestTick = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(tick);
  };

  const setSpotToElement = (el) => {
    const r = el.getBoundingClientRect();
    spot.style.opacity = "1";


    // screen coords → percentage
    const cx = (r.left + r.width / 2) / window.innerWidth;
    const cy = (r.top + r.height * 0.35) / window.innerHeight;

    targetPos.x = Math.max(10, Math.min(90, cx * 100));
    targetPos.y = Math.max(10, Math.min(75, cy * 100));

    requestTick();
  };

  // fallback scroll drift when no section is active
  const setSpotToScroll = () => {
    spot.style.opacity = "0.78";

    const scrollY = window.scrollY || 0;
    const docH = Math.max(1, document.body.scrollHeight - window.innerHeight);
    const t = Math.min(1, scrollY / docH);

    const sx = 50 + Math.sin(t * Math.PI * 2) * 3; // subtle
    const sy = 18 + t * 38;

    targetPos.x = sx;
    targetPos.y = sy;

    requestTick();
  };

  // Observe which section title is currently dominant
  let activeEl = null;

  const io = new IntersectionObserver(
    (entries) => {
      // pick the most visible target
      let best = null;
      let bestRatio = 0;

      for (const e of entries) {
        if (!e.isIntersecting) continue;
        if (e.intersectionRatio > bestRatio) {
          bestRatio = e.intersectionRatio;
          best = e.target;
        }
      }

      if (best) {
        activeEl = best;
        setSpotToElement(best);
      } else {
        activeEl = null;
      }
    },
    {
      // middle slice of the viewport
      root: null,
      threshold: [0.12, 0.22, 0.35, 0.5, 0.65],
      rootMargin: "-25% 0px -45% 0px",
    }
  );

  targets.forEach((t) => io.observe(t));

  // Scroll handler:
  // - If we have an active element -> keep spotlight on it
  // - Otherwise drift
  const onScroll = () => {
    if (activeEl) {
      setSpotToElement(activeEl);
    } else {
      setSpotToScroll();
    }
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
}


  "use strict";

  // ----------------------------
  // Helpers
  // ----------------------------
  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function safeAnime(props) {
    if (typeof anime === "undefined") return;
    anime(props);
  }

  function splitIntoChars(el) {
    if (!el) return;
    if (el.querySelector(".char")) return; // prevent double wrapping

    const rawText = el.textContent;
    el.textContent = "";

    for (const ch of rawText) {
      const span = document.createElement("span");
      span.className = "char";
      span.textContent = ch === " " ? "\u00A0" : ch;
      el.appendChild(span);
    }
  }

  // ----------------------------
  // Mobile nav
  // ----------------------------
  function setupMobileNav() {
    const hamburgerBtn = qs("#hamburgerBtn");
    const mobileNav = qs("#mobileNav");
    if (!hamburgerBtn || !mobileNav) return;

    hamburgerBtn.addEventListener("click", () => {
      mobileNav.classList.toggle("show");
    });

    qsa("a", mobileNav).forEach((a) => {
      a.addEventListener("click", () => mobileNav.classList.remove("show"));
    });
  }

  // ----------------------------
  // Welcome overlay animation
  // ----------------------------
  function runWelcomeAnimation() {
    const welcome = qs("#welcome");
    if (!welcome) return;

    document.body.style.overflow = "hidden";

    const inner = qs(".welcome-inner", welcome);
    const seal = qs(".welcome-seal", welcome);
    const ring = qs(".seal-ring", welcome);
    const flash = qs(".seal-flash", welcome);
    const lines = qs(".welcome-lines", welcome);
    const college = qs(".welcome-college", welcome);
    const tag = qs(".welcome-tag", welcome);
    const hint = qs(".welcome-hint", welcome);

    // If anime isn't loaded, just remove overlay on click
    if (typeof anime === "undefined") {
      welcome.addEventListener("click", () => {
        welcome.remove();
        document.body.style.overflow = "";
      });
      return;
    }

    // Start states
    anime.set(inner, { opacity: 0, scale: 0.985 });
    anime.set([seal, college, tag, hint], { opacity: 0, translateY: 10 });
    anime.set(lines, { opacity: 0 });
    anime.set(flash, { opacity: 0, scale: 0.9 });

    const tl = anime.timeline({
      easing: "easeOutExpo",
      autoplay: true,
    });

    // Container in
    tl.add({
      targets: inner,
      opacity: [0, 1],
      scale: [0.985, 1],
      duration: 460,
    });

    // Lines appear (dim)
    tl.add(
      {
        targets: lines,
        opacity: [0, 0.28],
        duration: 480,
        easing: "easeInOutSine",
      },
      "-=180"
    );

    // Seal stamp
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

    // Flash burst
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

    // Ring rotate
    tl.add(
      {
        targets: ring,
        rotate: [0, 360],
        duration: 1100,
        easing: "easeInOutSine",
      },
      "-=560"
    );

    // College name in
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

    // Tag + hint
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

    // Gentle glow pulse
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

    // Auto dismiss
    setTimeout(dismiss, 1600);

    welcome.addEventListener("click", dismiss);
    window.addEventListener("keydown", dismiss);
  }

  // ----------------------------
  // Hero title animation (2-line, safe)
  // ----------------------------
  function animateHeroTitle() {
    const line1 = qs(".hero-line-1");
    const line2 = qs(".hero-line-2");

    // If user didn't update HTML yet, do nothing
    if (!line1 || !line2) return;
    if (typeof anime === "undefined") return;

    splitIntoChars(line1);
    splitIntoChars(line2);

    anime({
      targets: ".hero-line-1 .char",
      translateY: [18, 0],
      opacity: [0, 1],
      easing: "easeOutExpo",
      duration: 880,
      delay: anime.stagger(18),
    });

    anime({
      targets: ".hero-line-2 .char",
      translateY: [18, 0],
      opacity: [0, 1],
      easing: "easeOutExpo",
      duration: 880,
      delay: anime.stagger(18, { start: 220 }),
    });
  }

  // ----------------------------
  // Counter animation
  // ----------------------------
  function setupCounters() {
    const counters = qsa("[data-count]");
    if (!counters.length) return;

    const seen = new WeakSet();

    function animateCount(el) {
      const end = Number(el.getAttribute("data-count")) || 0;
      const durationMs = 900;

      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / durationMs);
        const eased = 1 - Math.pow(1 - p, 3);

        el.textContent = String(Math.floor(end * eased));

        if (p < 1) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          if (seen.has(e.target)) continue;
          seen.add(e.target);
          animateCount(e.target);
        }
      },
      { threshold: 0.55 }
    );

    counters.forEach((el) => io.observe(el));
  }

  // ----------------------------
  // CTA Neon Pulse
  // ----------------------------
  function animateNeonCTA() {
    if (typeof anime === "undefined") return;

    const cta = qs(".btn-primary");
    if (!cta) return;

    anime({
      targets: cta,
      boxShadow: [
        "0 14px 34px rgba(183,107,255,.18)",
        "0 22px 60px rgba(255,79,216,.30)",
      ],
      duration: 1200,
      easing: "easeInOutSine",
      direction: "alternate",
      loop: true,
    });
  }

  // ----------------------------
  // One reveal system (anime.js)
  // ----------------------------
  function setupRevealAnimations() {
    if (typeof anime === "undefined") return;

    const targets = qsa(".card, .tl-card, .royal-card, .metric, .section-head");
    if (!targets.length) return;

    const seen = new WeakSet();

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          if (seen.has(e.target)) continue;
          seen.add(e.target);

          anime({
            targets: e.target,
            translateY: [16, 0],
            opacity: [0, 1],
            duration: 780,
            easing: "easeOutExpo",
          });
        }
      },
      { threshold: 0.14 }
    );

    targets.forEach((el) => {
      // start state
      el.style.opacity = "0";
      io.observe(el);
    });
  }



  // ----------------------------
  // Init
  // ----------------------------
  setupMobileNav();
  runWelcomeAnimation();

  // after welcome starts, we can still prep animations
  animateHeroTitle();
  setupScrollSpotlightSnap();
  setupCounters();
  animateNeonCTA();
  setupRevealAnimations();
})();

