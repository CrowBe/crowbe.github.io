// ── Ben Crow — homepage scripts ──
// Theme toggle, popover-nav fallback, FAB fallback, carousel keys,
// and the WebGL2 shader hero. Everything degrades gracefully.

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
  // Browser drives open/close via popovertarget; keep aria in sync.
  navLinks.addEventListener("toggle", (e) => {
    navToggle.setAttribute("aria-expanded", e.newState === "open");
  });
  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (navLinks.matches(":popover-open")) navLinks.hidePopover();
    });
  });
} else {
  // Fallback: classic class toggle.
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

// ── Keyboard navigation for horizontal card rails ──
document.querySelectorAll(".project-list, .writing-card-list").forEach((list) => {
  list.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const card = list.firstElementChild;
      const step = card ? card.offsetWidth + 24 : 320;
      list.scrollBy({ left: e.key === "ArrowRight" ? step : -step });
    }
  });
});

// ── WebGL2 shader hero ────────────────────────────────────────
// Layered simplex/FBM flow field in the brand palette, with eased
// pointer parallax. Pauses offscreen and on tab blur; renders one
// static frame under prefers-reduced-motion; CSS gradient fallback
// stays in place when WebGL2 is unavailable.
(() => {
  const hero = document.getElementById("top");
  const canvas = hero && hero.querySelector(".hero-canvas");
  if (!canvas) return;

  let gl = null;
  try {
    gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "low-power" });
  } catch (e) {}
  if (!gl) return;

  const VERT = `#version 300 es
  void main() {
    vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
    gl_Position = vec4(p, 0.0, 1.0);
  }`;

  const FRAG = `#version 300 es
  precision highp float;
  uniform vec2 u_res;
  uniform float u_time;
  uniform vec2 u_mouse;
  uniform float u_light;
  out vec4 outColor;

  vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * snoise(p);
      p = p * 2.03 + vec2(13.7, 7.1);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
    vec2 m = u_mouse * 0.1;
    float t = u_time * 0.02;
    vec2 p = uv * 0.85;

    // slow, softly domain-warped flow field
    vec2 q = vec2(fbm(p + t), fbm(p - t * 0.8 + 2.7));
    vec2 r = vec2(fbm(p * 1.15 + q * 0.9 + m + t * 0.5), fbm(p * 1.15 + q * 0.8 - m * 0.7 + 5.2));
    float f = fbm(p * 1.25 + r * 1.1);

    // brand palette (linear-ish; gamma applied on output);
    // each stop blends to its light-theme counterpart via u_light
    vec3 ink = mix(vec3(0.016, 0.003, 0.05), vec3(0.90, 0.885, 0.85), u_light);   // near-black #0d0221 → warm paper
    vec3 indigo = mix(vec3(0.026, 0.1, 0.32), vec3(0.50, 0.60, 0.85), u_light);   // deep indigo #0a2463 → indigo wash
    vec3 glow = mix(vec3(0.09, 0.2, 0.55), vec3(0.70, 0.78, 0.96), u_light);      // lifted indigo → pale glow
    vec3 coral = vec3(0.996, 0.373, 0.333);   // coral #fe5f55

    vec3 col = mix(ink, indigo, smoothstep(-0.7, 0.9, f) * mix(0.85, 0.55, u_light));
    col = mix(col, glow, smoothstep(0.3, 1.0, q.y) * mix(0.18, 0.3, u_light));

    // sparse coral glints along flow ridges
    float glint = smoothstep(0.62, 0.95, r.x) * smoothstep(0.5, 0.9, f);
    col = mix(col, coral, glint * mix(0.16, 0.1, u_light));

    // vignette for text legibility (gentler on light paper)
    col *= 1.0 - mix(0.34, 0.1, u_light) * dot(uv, uv);

    // gamma
    col = pow(max(col, 0.0), vec3(0.4545));
    outColor = vec4(col, 1.0);
  }`;

  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("Hero shader compile error:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("Hero shader link error:", gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  const uRes = gl.getUniformLocation(prog, "u_res");
  const uTime = gl.getUniformLocation(prog, "u_time");
  const uMouse = gl.getUniformLocation(prog, "u_mouse");
  const uLight = gl.getUniformLocation(prog, "u_light");

  // Theme drives the shader palette; eased so toggling cross-fades.
  const themeLight = () => (document.documentElement.getAttribute("data-theme") === "dark" ? 0 : 1);
  let lightTarget = themeLight();
  let lightNow = lightTarget;

  hero.classList.add("webgl");

  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
  const resize = () => {
    const w = Math.round(hero.clientWidth * dpr());
    const h = Math.round(hero.clientHeight * dpr());
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };
  resize();

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;

  const draw = (timeSec) => {
    mouseX += (targetX - mouseX) * 0.045;
    mouseY += (targetY - mouseY) * 0.045;
    lightNow += (lightTarget - lightNow) * 0.08;
    if (Math.abs(lightTarget - lightNow) < 0.002) lightNow = lightTarget;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, timeSec);
    gl.uniform2f(uMouse, mouseX, mouseY);
    gl.uniform1f(uLight, lightNow);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const watchTheme = (onChange) => {
    new MutationObserver(() => {
      lightTarget = themeLight();
      if (onChange) onChange();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  };

  if (reduceMotion) {
    // Single static, atmospheric frame — no loop, no pointer tracking.
    draw(37.0);
    window.addEventListener("resize", () => {
      resize();
      draw(37.0);
    });
    watchTheme(() => {
      lightNow = lightTarget;
      draw(37.0);
    });
    return;
  }
  watchTheme();

  window.addEventListener("resize", resize);
  hero.addEventListener("pointermove", (e) => {
    const rect = hero.getBoundingClientRect();
    targetX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    targetY = 1 - ((e.clientY - rect.top) / rect.height) * 2;
  });

  let rafId = 0;
  let visible = true;
  const loop = (now) => {
    draw(now / 1000);
    rafId = requestAnimationFrame(loop);
  };
  const setRunning = (run) => {
    if (run && !rafId) {
      rafId = requestAnimationFrame(loop);
    } else if (!run && rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        setRunning(visible && !document.hidden);
      },
      { threshold: 0.01 }
    ).observe(hero);
  }
  document.addEventListener("visibilitychange", () => {
    setRunning(visible && !document.hidden);
  });

  setRunning(true);
})();
