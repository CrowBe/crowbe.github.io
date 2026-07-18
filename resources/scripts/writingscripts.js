// ── Ben Crow — writing pages scripts ──
// Theme toggle, popover-nav fallback, FAB fallback.

// ── Theme cycle: light → dark → system default ──
// Initial state is set by an inline head script; "system" follows
// prefers-color-scheme live and stores nothing.
const themeToggle = document.querySelector(".theme-toggle");
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
const applyThemeMode = (mode) => {
  const theme = mode === "system" ? (systemDark.matches ? "dark" : "light") : mode;
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.setAttribute("data-theme-mode", mode);
  const label = mode === "system" ? "system default" : mode;
  themeToggle.setAttribute("aria-label", "Theme: " + label + " — activate to change");
  themeToggle.title = "Theme: " + label;
};
themeToggle.addEventListener("click", () => {
  const order = ["light", "dark", "system"];
  const current = document.documentElement.getAttribute("data-theme-mode") || "system";
  const next = order[(order.indexOf(current) + 1) % order.length];
  applyThemeMode(next);
  try {
    if (next === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", next);
  } catch (e) {}
});
systemDark.addEventListener("change", () => {
  if (document.documentElement.getAttribute("data-theme-mode") === "system") applyThemeMode("system");
});
applyThemeMode(document.documentElement.getAttribute("data-theme-mode") || "system");

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
