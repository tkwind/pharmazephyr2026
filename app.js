(function () {
  // ----------------------------
  // Mobile nav
  // ----------------------------
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const mobileNav = document.getElementById("mobileNav");

  hamburgerBtn?.addEventListener("click", () => {
    mobileNav.classList.toggle("show");
  });

  mobileNav?.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => mobileNav.classList.remove("show"));
  });

  // ----------------------------
  // Hero title animation (letters)
  // ----------------------------
  function animateHeroTitle() {
    const title = document.querySelector(".hero-title");
    if (!title) return;

    // Prevent double-wrapping
    if (title.querySelector(".char")) return;

    const raw = title.textContent.trim();

    title.innerHTML = raw.replace(/\S/g, "<span class='char'>$&</span>");

    anime({
      targets: ".hero-title .char",
      translateY: [18, 0],
      opacity: [0, 1],
      easing: "easeOutExpo",
      duration: 900,
      delay: anime.stagger(18),
    });
  }

  // ----------------------------
  // Animate elements ONCE on view
  // ----------------------------
  function animateOnView(selector, animeProps) {
    const els = document.querySelectorAll(selector);
    const seen = new WeakSet();

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          if (seen.has(e.target)) return;
          seen.add(e.target);

          anime({
            targets: e.target,
            ...animeProps,
          });
        });
      },
      { threshold: 0.25 }
    );

    els.forEach((el) => io.observe(el));
  }

  // ----------------------------
  // Counter animation (50 events etc)
  // ----------------------------
  const counters = document.querySelectorAll("[data-count]");
  const counterSeen = new WeakSet();

  const animateCount = (el) => {
    const end = Number(el.getAttribute("data-count")) || 0;
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
  };

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        if (counterSeen.has(e.target)) return;
        counterSeen.add(e.target);
        animateCount(e.target);
      });
    },
    { threshold: 0.55 }
  );

  counters.forEach((el) => counterObserver.observe(el));

  // ----------------------------
  // Neon pulse effect (CTA button)
  // ----------------------------
  function animateNeonCTA() {
    const cta = document.querySelector(".btn-primary");
    if (!cta) return;

    anime({
      targets: cta,
      boxShadow: [
        "0 18px 40px rgba(255,79,216,.18)",
        "0 24px 65px rgba(255,79,216,.35)"
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
  tl.add({
    targets: lines,
    opacity: [0, 0.28],
    duration: 480,
    easing: "easeInOutSine",
  }, "-=180");

  // Seal stamp
  tl.add({
    targets: seal,
    opacity: [0, 1],
    translateY: [18, 0],
    scale: [0.90, 1],
    duration: 520,
    easing: "easeOutBack",
  }, "-=360");

  // Flash burst
  tl.add({
    targets: flash,
    opacity: [0, 0.9, 0],
    scale: [0.9, 1.18, 1.35],
    duration: 520,
    easing: "easeOutQuad",
  }, "-=420");

  // Ring rotate
  tl.add({
    targets: ring,
    rotate: [0, 360],
    duration: 1100,
    easing: "easeInOutSine",
  }, "-=560");

  // College name in (big, premium)
  tl.add({
    targets: college,
    opacity: [0, 1],
    translateY: [10, 0],
    duration: 520,
    easing: "easeOutQuad",
  }, "-=820");

  // Tag + hint
  tl.add({
    targets: [tag, hint],
    opacity: [0, 1],
    translateY: [10, 0],
    duration: 420,
    delay: anime.stagger(120),
  }, "-=520");

  // Gentle glow pulse
  anime({
    targets: ring,
    boxShadow: [
      "0 0 0 8px rgba(255,255,255,.02), 0 0 40px rgba(255,79,216,.12)",
      "0 0 0 8px rgba(255,255,255,.02), 0 0 70px rgba(255,79,216,.22)"
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

  // Auto dismiss faster (since no title animation)
  setTimeout(dismiss, 1600);

  welcome.addEventListener("click", dismiss);
  window.addEventListener("keydown", dismiss);
}


  // ----------------------------
  // Start animations
  // ----------------------------
  runWelcomeAnimation();
  animateHeroTitle();
  animateNeonCTA();

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


