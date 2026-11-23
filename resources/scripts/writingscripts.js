// ── Ben Crow — writing pages scripts ──
// Theme toggle (<meta name="color-scheme">), popover-nav fallback, FAB fallback.

// ── Theme cycle: light → dark → system ("light dark") ──
// Initial state is set by an inline head script; "light dark" follows
// prefers-color-scheme live and stores nothing.
const themeToggle = document.querySelector(".theme-toggle");
const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

const normalizeScheme = (value) => (value === "light" || value === "dark" ? value : "light dark");

const applyColorScheme = (scheme) => {
  const next = normalizeScheme(scheme);
  if (colorSchemeMeta) colorSchemeMeta.content = next;
  const resolved = next === "light dark" ? (systemDark.matches ? "dark" : "light") : next;
  const label = next === "light dark" ? `system (currently ${resolved})` : next;
  themeToggle.setAttribute("aria-label", `Theme: ${label} — activate to change`);
};

themeToggle.addEventListener("click", () => {
  const order = ["light", "dark", "light dark"];
  const current = normalizeScheme(colorSchemeMeta?.content);
  const next = order[(order.indexOf(current) + 1) % order.length];
  applyColorScheme(next);
  try {
    localStorage.removeItem("theme");
    if (next === "light dark") localStorage.removeItem("color-scheme");
    else localStorage.setItem("color-scheme", next);
  } catch (e) {}
});

systemDark.addEventListener("change", () => {
  if (normalizeScheme(colorSchemeMeta?.content) === "light dark") applyColorScheme("light dark");
});

window.addEventListener("storage", (event) => {
  if (event.key === "color-scheme") applyColorScheme(event.newValue);
});

applyColorScheme(colorSchemeMeta?.content);

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
