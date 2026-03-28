// ── Smooth scroll for anchor navigation ──
const anchorScroller = () => {
  const { hash } = window.location;
  if (hash) {
    const node = document.querySelector(hash);
    if (node) {
      node.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }
};

window.addEventListener("hashchange", anchorScroller);

// ── Landing background animation ──
const boxArea = document.getElementById("animation-area");

const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min))) + Math.ceil(min);
};

const setCssVariables = (box) => {
  box.style.setProperty("--animation-duration", getRandomInt(5, 20) + "s");
  box.style.setProperty("--animation-delay", getRandomInt(0, 8) + "s");
  box.style.setProperty("--box-size", getRandomInt(15, 100) + "px");
  box.style.setProperty("--box-position", getRandomInt(5, 75) + "%");
};

const boxUpdater = (event) => {
  event.target.remove();
  newBox();
};

const newBox = () => {
  const box = document.createElement("li");
  setCssVariables(box);
  boxArea.appendChild(box);
  box.addEventListener("animationend", boxUpdater);
};

for (let i = 0; i < 10; i++) {
  newBox();
}

// ── Mobile nav toggle ──
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

navToggle.addEventListener("click", () => {
  const expanded = navToggle.getAttribute("aria-expanded") === "true";
  navToggle.setAttribute("aria-expanded", !expanded);
  navLinks.classList.toggle("open");
});

// Close mobile nav when a link is clicked
navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navToggle.setAttribute("aria-expanded", "false");
    navLinks.classList.remove("open");
  });
});

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

// ── Keyboard navigation for project carousel ──
const projectList = document.querySelector(".project-list");

projectList.addEventListener("keydown", (e) => {
  const cardWidth = 290; // approximate card visible width with overlap
  if (e.key === "ArrowRight") {
    e.preventDefault();
    projectList.scrollBy({ left: cardWidth, behavior: "smooth" });
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    projectList.scrollBy({ left: -cardWidth, behavior: "smooth" });
  }
});
