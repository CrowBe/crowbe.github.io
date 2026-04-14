// ── Dark mode toggle ──
const themeToggle = document.querySelector(".theme-toggle");
const themeIcon = themeToggle.querySelector("i");

const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
  themeIcon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
  localStorage.setItem("theme", theme);
};

// Initialize from saved preference or system preference
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
  applyTheme(savedTheme);
} else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
  applyTheme("dark");
}

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  applyTheme(current === "dark" ? "light" : "dark");
});

// ── Mobile nav toggle ──
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

navToggle.addEventListener("click", () => {
  const expanded = navToggle.getAttribute("aria-expanded") === "true";
  navToggle.setAttribute("aria-expanded", !expanded);
  navLinks.classList.toggle("open");
});

navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navToggle.setAttribute("aria-expanded", "false");
    navLinks.classList.remove("open");
  });
});

// ── FAB back-to-top ──
const fabTop = document.querySelector(".fab-top");

const handleFabVisibility = () => {
  if (window.scrollY > window.innerHeight * 0.5) {
    fabTop.classList.add("visible");
  } else {
    fabTop.classList.remove("visible");
  }
};

window.addEventListener("scroll", handleFabVisibility, { passive: true });

fabTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
