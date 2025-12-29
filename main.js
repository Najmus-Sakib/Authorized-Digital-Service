// main.js (FULL FILE)
const WHATSAPP_NUMBER = "13213787570";

function waLink(message) {
  const txt = encodeURIComponent(message || "Hi!");
  return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + txt;
}

document.querySelectorAll("[data-wa]").forEach((a) => {
  const msg = a.getAttribute("data-wa") || "Hi!";
  a.setAttribute("href", waLink(msg));
  a.setAttribute("target", "_blank");
  a.setAttribute("rel", "noopener");
});

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* =========================
   Navbar
========================= */
const header = document.getElementById("siteHeader");
const navBtn = document.getElementById("navBtn");
const siteNav = document.getElementById("siteNav");
const backdrop = document.getElementById("navBackdrop");

function openNav() {
  header.classList.add("nav-open");
  navBtn.setAttribute("aria-expanded", "true");
  backdrop.setAttribute("aria-hidden", "false");
}
function closeNav() {
  header.classList.remove("nav-open");
  navBtn.setAttribute("aria-expanded", "false");
  backdrop.setAttribute("aria-hidden", "true");
}

if (navBtn && header && siteNav && backdrop) {
  navBtn.addEventListener("click", () => {
    header.classList.contains("nav-open") ? closeNav() : openNav();
  });
  backdrop.addEventListener("click", closeNav);
  siteNav.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeNav));

  window.addEventListener(
    "scroll",
    () => {
      if (window.scrollY > 8) header.classList.add("is-scrolled");
      else header.classList.remove("is-scrolled");
    },
    { passive: true }
  );

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNav();
  });
}

/* =========================
   1) Hero Alignment Fix
   - Align top of combo card with CTA row top
   - Desktop only
========================= */
(function alignHeroComboCard() {
  const actions = document.getElementById("heroActions");
  const card = document.getElementById("comboCard");
  const grid = document.querySelector(".hero__grid");
  if (!actions || !card || !grid) return;

  const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function applyAlignment() {
    // Only when hero is two-column (desktop)
    const isDesktop = window.matchMedia("(min-width: 981px)").matches;
    if (!isDesktop) {
      card.style.removeProperty("--heroCardOffset");
      return;
    }

    // Measure relative to the hero grid to avoid scroll effects
    const gridTop = grid.getBoundingClientRect().top;
    const actionsTop = actions.getBoundingClientRect().top - gridTop;
    const cardTop = card.getBoundingClientRect().top - gridTop;

    const delta = Math.round(actionsTop - cardTop);

    // Move card only (no size/layout changes)
    card.style.setProperty("--heroCardOffset", `${delta}px`);

    // Avoid any transition-based “slide” feeling
    if (prefersReduced) {
      card.style.transform = "none";
    }
  }

  // Run ASAP and on resize/font load
  const run = () => requestAnimationFrame(applyAlignment);
  window.addEventListener("load", run);
  window.addEventListener("resize", run, { passive: true });
  document.addEventListener("DOMContentLoaded", run);
})();

/* =========================
   2) Reviews Auto Horizontal Loop + Drag
   - Continuous slow motion
   - Pause on hover
   - Touch swipe supported
   - No page overflow
========================= */
(function reviewsAutoLoop() {
  const slider = document.getElementById("reviewsSlider");
  const track = document.getElementById("reviewsTrack");
  if (!slider || !track) return;

  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Measure original width (before cloning) for seamless loop
  let singleWidth = 0;

  function setupLoop() {
    // Reset any previous clones (safe)
    const kids = Array.from(track.children);
    track.innerHTML = "";
    kids.forEach((n) => track.appendChild(n));

    // Measure original set width
    singleWidth = track.scrollWidth;

    // Clone once for seamless loop
    kids.forEach((n) => track.appendChild(n.cloneNode(true)));
  }

  setupLoop();

  let x = 0;              // translateX (negative)
  let vel = 0;            // drag inertia
  let dragging = false;
  let pointerId = null;
  let startX = 0;
  let startTranslate = 0;
  let lastX = 0;
  let lastT = 0;

  // Auto speed control (smooth pause/resume)
  const AUTO_PPS = 22; // px/sec (slow + premium)
  let autoTarget = 1;  // 1 = running, 0 = paused
  let autoFactor = 1;  // eased

  function wrap() {
    // Keep x in [-singleWidth, 0)
    if (singleWidth <= 0) return;
    while (x <= -singleWidth) x += singleWidth;
    while (x > 0) x -= singleWidth;
  }

  function setTransform() {
    track.style.transform = `translate3d(${x}px,0,0)`;
  }

  // Hover pause (desktop)
  slider.addEventListener("mouseenter", () => {
    autoTarget = 0;
    vel = 0; // stop motion cleanly when hovering
  });
  slider.addEventListener("mouseleave", () => {
    autoTarget = 1;
  });

  // Pointer drag (touch + mouse)
  track.addEventListener(
    "pointerdown",
    (e) => {
      dragging = true;
      pointerId = e.pointerId;
      track.setPointerCapture(pointerId);

      autoTarget = 0; // pause while dragging
      vel = 0;

      startX = e.clientX;
      startTranslate = x;

      lastX = e.clientX;
      lastT = performance.now();
    },
    { passive: true }
  );

  track.addEventListener(
    "pointermove",
    (e) => {
      if (!dragging || e.pointerId !== pointerId) return;

      const dx = e.clientX - startX;
      x = startTranslate + dx;

      const now = performance.now();
      const dt = Math.max(16, now - lastT);
      vel = (e.clientX - lastX) / dt * 1000; // px/sec
      lastX = e.clientX;
      lastT = now;

      wrap();
      setTransform();
    },
    { passive: true }
  );

  function endDrag(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    dragging = false;
    try {
      track.releasePointerCapture(pointerId);
    } catch {}
    pointerId = null;

    // Resume auto smoothly after interaction
    autoTarget = 1;
  }

  track.addEventListener("pointerup", endDrag, { passive: true });
  track.addEventListener("pointercancel", endDrag, { passive: true });

  // Recompute on resize (keeps loop stable)
  window.addEventListener(
    "resize",
    () => {
      setupLoop();
      x = 0;
      vel = 0;
      setTransform();
    },
    { passive: true }
  );

  // Animation loop
  let lastTime = performance.now();
  function raf(t) {
    const dt = Math.min(0.05, (t - lastTime) / 1000);
    lastTime = t;

    // Ease pause/resume
    autoFactor += (autoTarget - autoFactor) * 0.08;

    if (!reduceMotion) {
      if (!dragging) {
        // Auto motion
        x -= AUTO_PPS * autoFactor * dt;

        // Inertia after drag (very light)
        if (Math.abs(vel) > 1) {
          x += vel * dt;
          vel *= Math.pow(0.12, dt); // gentle decay
        } else {
          vel = 0;
        }

        wrap();
        setTransform();
      }
    }

    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
})();

/* =========================
   3) Contact Section Premium Reveal (Get In Touch)
   - IntersectionObserver trigger (scroll into view)
   - Also highlights on #contact hash navigation / nav click
   - Respects prefers-reduced-motion
   - Added for Contact section only
========================= */
(function contactPremiumReveal() {
  const section = document.getElementById("contact");
  if (!section) return;

  const reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Keep everything visible & static for reduced motion users
  if (reduceMotion) return;

  // Gate CSS animations to Contact only (no global style changes)
  document.body.classList.add("motion-ok");
  section.classList.add("contact--js");

  // Fallback: avoid leaving the section hidden on very old browsers
  if (!("IntersectionObserver" in window)) {
    section.classList.add("contact--in");
    return;
  }

  let revealed = false;
  let focusTimer = null;

  function focusPulse() {
    section.classList.add("contact--focus");
    if (focusTimer) window.clearTimeout(focusTimer);
    focusTimer = window.setTimeout(() => section.classList.remove("contact--focus"), 1400);
  }

  function revealOnce() {
    if (revealed) return;
    revealed = true;

    // Ensure the browser applies the initial state before transitioning in
    requestAnimationFrame(() => {
      section.classList.add("contact--in");
      focusPulse();
    });
  }

  // 1) Scroll into view (premium staggered reveal)
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          revealOnce();
          io.disconnect();
          break;
        }
      }
    },
    { threshold: 0.25 }
  );
  io.observe(section);

  // 2) Hash navigation (direct /#contact or hashchange)
  function handleHash() {
    if (window.location.hash === "#contact") {
      // If user lands directly here, run the same entrance animation + highlight
      revealOnce();
    }
  }
  window.addEventListener("hashchange", handleHash);
  handleHash();

  // 3) Clicking "Contact" again should add a subtle focus highlight (even after reveal)
  document.addEventListener("click", (e) => {
    const link = e.target && e.target.closest ? e.target.closest('a[href="#contact"]') : null;
    if (!link) return;

    // After the browser scrolls, apply the highlight (or let IO handle first reveal)
    window.setTimeout(() => {
      if (revealed) focusPulse();
    }, 450);
  });
})();
