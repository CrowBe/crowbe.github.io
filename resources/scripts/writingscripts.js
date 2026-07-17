// ── Ben Crow — writing pages scripts ──
// Theme toggle, popover-nav fallback, FAB fallback.

// ── Theme toggle (initial theme is set by an inline head script) ──
const themeToggle = document.querySelector(".theme-toggle");
themeToggle.addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem("theme", next);
  } catch (e) {}
});

// ── Mobile nav: native Popover API where supported ──
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.getElementById("nav-links");

if (HTMLElement.prototype.hasOwnProperty("popover")) {
  navLinks.addEventListener("toggle", (e) => {
    navToggle.setAttribute("aria-expanded", e.newState === "open");
  });
  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (navLinks.matches(":popover-open")) navLinks.hidePopover();
    });
  });
} else {
  navLinks.removeAttribute("popover");
  const setOpen = (open) => {
    navLinks.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", String(open));
  };
  navToggle.addEventListener("click", () => setOpen(!navLinks.classList.contains("open")));
  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });
}

// ── Back-to-top FAB (scroll-driven animation where supported) ──
const fabTop = document.querySelector(".fab-top");
fabTop.addEventListener("click", () => window.scrollTo({ top: 0 }));

const fabScrollDriven =
  window.CSS &&
  CSS.supports("animation-timeline: scroll()") &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!fabScrollDriven) {
  document.documentElement.classList.add("no-scroll-timeline");
  const handleFabVisibility = () => {
    fabTop.classList.toggle("visible", window.scrollY > window.innerHeight * 0.5);
  };
  window.addEventListener("scroll", handleFabVisibility, { passive: true });
  handleFabVisibility();
}
