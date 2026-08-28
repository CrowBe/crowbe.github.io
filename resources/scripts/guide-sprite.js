// ── Guide sprite: the firefly that shows you where to look ─────
// When site-focus.js highlights something, a small glowing character
// launches from the chat launcher (or the nearest screen edge), arcs
// across the viewport, orbits the highlighted element for a beat, pops,
// and fades out. It only ever moves on a focus event — never idly, and
// never under prefers-reduced-motion.
//
// Two renderers behind one interface:
//   · WebGPU   — instanced glow quads, additive blend, WGSL. Preferred.
//   · Canvas2D — radial gradients with "lighter" compositing. Fallback.
// The simulation is identical either way; only the draw call differs.
(() => {
  "use strict";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const MAX_SPARKS = 96;          // hard cap; sizes the GPU buffer
  const TRAIL = 26;               // trailing spark count
  const TRAVEL_MS = 1050;         // launch → arrival
  const ORBIT_MS = 1500;          // circling the target
  const FADE_MS = 550;            // burst + fade out
  const FLOATS_PER_SPARK = 8;     // pos.xy, size, alpha, tint.rgb, pad

  // Brand palette, linear-ish — the same coral/indigo the hero shader uses.
  // Two of them, because the compositing has to change with the theme:
  // on the dark sections the sparks are blended additively and glow, but
  // adding light to a paper background is invisible, so light mode paints
  // saturated ink over the page with ordinary alpha blending instead.
  const PALETTE = {
    dark: { core: [1.0, 0.82, 0.55], glow: [1.0, 0.42, 0.36], accent: [0.45, 0.58, 1.0] },
    light: { core: [1.0, 0.43, 0.3], glow: [0.79, 0.26, 0.23], accent: [0.16, 0.24, 0.55] },
  };
  const isLight = () => document.documentElement.getAttribute("data-theme") !== "dark";

  // ── Renderers ───────────────────────────────────────────────
  const WGSL = `
struct Spark {
  pos: vec2f,
  size: f32,
  alpha: f32,
  tint: vec3f,
  pad: f32,
};

@group(0) @binding(0) var<storage, read> sparks: array<Spark>;
@group(0) @binding(1) var<uniform> viewport: vec4f;

struct VSOut {
  @builtin(position) clip: vec4f,
  @location(0) uv: vec2f,
  @location(1) tint: vec3f,
  @location(2) alpha: f32,
};

@vertex
fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VSOut {
  var corners = array<vec2f, 6>(
    vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0), vec2f(1.0, -1.0), vec2f(1.0, 1.0)
  );
  let corner = corners[vi];
  let spark = sparks[ii];
  let px = spark.pos + corner * spark.size;
  var out: VSOut;
  out.clip = vec4f(px.x / viewport.x * 2.0 - 1.0, 1.0 - px.y / viewport.y * 2.0, 0.0, 1.0);
  out.uv = corner;
  out.tint = spark.tint;
  out.alpha = spark.alpha;
  return out;
}

@fragment
fn fs(in: VSOut) -> @location(0) vec4f {
  // Tight core plus a wide soft halo — reads as a glow rather than a disc.
  let falloff = max(1.0 - length(in.uv), 0.0);
  let core = pow(falloff, 3.0);
  let halo = pow(falloff, 1.35) * 0.4;
  let intensity = (core + halo) * in.alpha;
  return vec4f(in.tint * intensity, intensity);
}`;

  const createWebGPURenderer = async (canvas) => {
    if (!navigator.gpu) return null;
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: "low-power" });
    if (!adapter) return null;
    const device = await adapter.requestDevice();
    const context = canvas.getContext("webgpu");
    if (!context) return null;

    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: "premultiplied" });

    const module = device.createShaderModule({ code: WGSL });

    // An explicit layout, not "auto": the two pipelines below differ only
    // in blend state and must share one bind group, and every "auto"
    // pipeline gets its own incompatible layout.
    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
        { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } },
      ],
    });
    const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });

    // Both blends consume premultiplied output from the same shader:
    // additive stacks glows on the dark theme, over paints them on paper.
    const buildPipeline = (blend) =>
      device.createRenderPipeline({
        layout: pipelineLayout,
        vertex: { module, entryPoint: "vs" },
        fragment: { module, entryPoint: "fs", targets: [{ format, blend }] },
        primitive: { topology: "triangle-list" },
      });
    const pipelines = {
      additive: buildPipeline({
        color: { srcFactor: "one", dstFactor: "one", operation: "add" },
        alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
      }),
      over: buildPipeline({
        color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
        alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
      }),
    };

    const sparkData = new Float32Array(MAX_SPARKS * FLOATS_PER_SPARK);
    const sparkBuffer = device.createBuffer({
      size: sparkData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const viewportData = new Float32Array(4);
    const viewportBuffer = device.createBuffer({
      size: viewportData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: sparkBuffer } },
        { binding: 1, resource: { buffer: viewportBuffer } },
      ],
    });

    let lost = false;
    device.lost.then(() => {
      lost = true;
    });

    return {
      kind: "webgpu",
      get lost() {
        return lost;
      },
      draw(sparks, width, height, additive = true) {
        if (lost) return;
        const count = Math.min(sparks.length, MAX_SPARKS);
        for (let i = 0; i < count; i++) {
          const spark = sparks[i];
          const at = i * FLOATS_PER_SPARK;
          sparkData[at] = spark.x;
          sparkData[at + 1] = spark.y;
          sparkData[at + 2] = spark.size;
          sparkData[at + 3] = spark.alpha;
          sparkData[at + 4] = spark.tint[0];
          sparkData[at + 5] = spark.tint[1];
          sparkData[at + 6] = spark.tint[2];
        }
        device.queue.writeBuffer(sparkBuffer, 0, sparkData, 0, count * FLOATS_PER_SPARK);
        viewportData[0] = width;
        viewportData[1] = height;
        device.queue.writeBuffer(viewportBuffer, 0, viewportData);

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
          colorAttachments: [
            {
              view: context.getCurrentTexture().createView(),
              clearValue: { r: 0, g: 0, b: 0, a: 0 },
              loadOp: "clear",
              storeOp: "store",
            },
          ],
        });
        if (count) {
          pass.setPipeline(additive ? pipelines.additive : pipelines.over);
          pass.setBindGroup(0, bindGroup);
          pass.draw(6, count);
        }
        pass.end();
        device.queue.submit([encoder.finish()]);
      },
    };
  };

  const createCanvas2DRenderer = (canvas) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const rgb = (tint, alpha) =>
      `rgba(${Math.round(tint[0] * 255)}, ${Math.round(tint[1] * 255)}, ${Math.round(tint[2] * 255)}, ${alpha})`;
    return {
      kind: "canvas2d",
      lost: false,
      draw(sparks, width, height, additive = true) {
        ctx.clearRect(0, 0, width, height);
        ctx.globalCompositeOperation = additive ? "lighter" : "source-over";
        for (const spark of sparks) {
          const gradient = ctx.createRadialGradient(spark.x, spark.y, 0, spark.x, spark.y, spark.size);
          gradient.addColorStop(0, rgb(spark.tint, spark.alpha));
          gradient.addColorStop(0.35, rgb(spark.tint, spark.alpha * 0.45));
          gradient.addColorStop(1, rgb(spark.tint, 0));
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      },
    };
  };

  // ── Flight ──────────────────────────────────────────────────
  const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const lerp = (a, b, t) => a + (b - a) * t;

  // Reassigned if WebGPU setup fails: a canvas only ever hands out one
  // context type, so the 2D fallback needs a fresh element.
  let canvas = document.createElement("canvas");
  canvas.className = "guide-sprite-canvas";
  canvas.setAttribute("aria-hidden", "true");

  let renderer = null;
  let rendererPromise = null;
  let width = 0;
  let height = 0;
  let scale = 1;

  const resize = () => {
    scale = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(window.innerWidth * scale);
    const h = Math.round(window.innerHeight * scale);
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    width = w;
    height = h;
  };

  // Where the firefly comes from: out of the chat launcher if it's on the
  // page (it reads as the assistant reaching onto the page), otherwise the
  // bottom-right corner it would have launched from anyway.
  const launchPoint = () => {
    const launcher = document.querySelector(".ask-ben-fab");
    if (launcher) {
      const rect = launcher.getBoundingClientRect();
      if (rect.width) return { x: (rect.left + rect.width / 2) * scale, y: (rect.top + rect.height / 2) * scale };
    }
    return { x: window.innerWidth * 0.92 * scale, y: window.innerHeight * 0.9 * scale };
  };

  // Aim at the element's heading where it has one — the eye wants the
  // title, not the centre of a tall card.
  const targetPoint = (element) => {
    const anchor = element.querySelector(".card-header h3, h4, h2") || element;
    const rect = anchor.getBoundingClientRect();
    if (!rect.width && !rect.height) return null;
    const x = Math.min(Math.max(rect.left + rect.width * 0.5, 40), window.innerWidth - 40);
    const y = Math.min(Math.max(rect.top + rect.height * 0.5, 40), window.innerHeight - 40);
    return { x: x * scale, y: y * scale };
  };

  let flight = null;
  let rafId = 0;
  const trail = [];
  const burst = [];
  const sparks = [];

  const stop = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    flight = null;
    trail.length = 0;
    burst.length = 0;
    canvas.classList.remove("is-flying");
    if (renderer) renderer.draw([], width, height);
  };

  const step = (now) => {
    if (!flight) return;
    resize();

    const elapsed = now - flight.start;
    const total = TRAVEL_MS + ORBIT_MS + FADE_MS;
    if (elapsed > total || (renderer && renderer.lost)) {
      stop();
      return;
    }

    // The page is usually still smooth-scrolling while the firefly flies,
    // so re-read the target every frame and let the sprite chase it.
    const aim = targetPoint(flight.element);
    if (aim) flight.to = aim;

    let x;
    let y;
    let lead = 1;

    if (elapsed < TRAVEL_MS) {
      // Quadratic arc: a control point pushed perpendicular to the
      // straight line so the path bows instead of sliding.
      const t = easeInOut(elapsed / TRAVEL_MS);
      const { from, to } = flight;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.hypot(dx, dy) || 1;
      const bow = Math.min(distance * 0.28, 220 * scale) * flight.bend;
      const cx = (from.x + to.x) / 2 - (dy / distance) * bow;
      const cy = (from.y + to.y) / 2 + (dx / distance) * bow;
      const inv = 1 - t;
      x = inv * inv * from.x + 2 * inv * t * cx + t * t * to.x;
      y = inv * inv * from.y + 2 * inv * t * cy + t * t * to.y;
      // Flutter — a fast, shrinking wobble so it moves like an insect
      // rather than a tweened dot.
      const flutter = (1 - t) * 9 * scale;
      x += Math.sin(elapsed * 0.021) * flutter;
      y += Math.cos(elapsed * 0.017) * flutter;
    } else if (elapsed < TRAVEL_MS + ORBIT_MS) {
      const t = (elapsed - TRAVEL_MS) / ORBIT_MS;
      const angle = flight.bend * t * Math.PI * 2.1 - Math.PI / 2;
      const radius = (1 - easeOut(t) * 0.45) * 34 * scale;
      x = flight.to.x + Math.cos(angle) * radius * 1.5;
      y = flight.to.y + Math.sin(angle) * radius;
      if (!flight.popped && t > 0.72) {
        flight.popped = true;
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2 + flight.bend;
          burst.push({
            x,
            y,
            vx: Math.cos(a) * (0.9 + Math.random() * 1.5) * scale,
            vy: Math.sin(a) * (0.9 + Math.random() * 1.5) * scale,
            born: now,
            hue: i % 3 === 0 ? "accent" : i % 3 === 1 ? "core" : "glow",
          });
        }
      }
    } else {
      const t = (elapsed - TRAVEL_MS - ORBIT_MS) / FADE_MS;
      lead = 1 - t;
      x = flight.to.x;
      y = flight.to.y - t * 26 * scale;
    }

    trail.unshift({ x, y });
    if (trail.length > TRAIL) trail.length = TRAIL;

    // Resolved per frame so toggling the theme mid-flight is picked up.
    const light = isLight();
    const palette = light ? PALETTE.light : PALETTE.dark;
    // Painted sparks don't accumulate the way stacked additive ones do,
    // so light mode needs more alpha to reach the same presence.
    const boost = light ? 1.45 : 1;

    // Rebuild the spark list each frame: head, trail, burst.
    sparks.length = 0;
    const pulse = 0.82 + Math.sin(elapsed * 0.012) * 0.18;
    sparks.push({ x, y, size: 18 * scale * pulse, alpha: Math.min(0.95 * boost, 1) * lead, tint: palette.core });
    sparks.push({ x, y, size: 42 * scale * pulse, alpha: 0.36 * boost * lead, tint: palette.glow });
    for (let i = 1; i < trail.length; i++) {
      const decay = 1 - i / trail.length;
      sparks.push({
        x: trail[i].x,
        y: trail[i].y,
        size: (4 + 10 * decay) * scale,
        alpha: 0.45 * boost * decay * decay * lead,
        tint: i % 5 === 0 ? palette.accent : palette.glow,
      });
    }
    for (let i = burst.length - 1; i >= 0; i--) {
      const spark = burst[i];
      const age = (now - spark.born) / 900;
      if (age >= 1) {
        burst.splice(i, 1);
        continue;
      }
      sparks.push({
        x: spark.x + spark.vx * (now - spark.born) * 0.06,
        y: spark.y + spark.vy * (now - spark.born) * 0.06 + age * age * 40 * scale,
        size: (3 + 5 * (1 - age)) * scale,
        alpha: (1 - age) * 0.7 * boost,
        tint: palette[spark.hue],
      });
    }
    if (sparks.length > MAX_SPARKS) sparks.length = MAX_SPARKS;

    renderer.draw(sparks, width, height, !light);
    rafId = requestAnimationFrame(step);
  };

  const launch = (element) => {
    resize();
    const to = targetPoint(element);
    if (!to) return;
    const from = flight && trail.length ? trail[0] : launchPoint();
    trail.length = 0;
    burst.length = 0;
    flight = {
      element,
      from,
      to,
      // Alternate which way the arc bows so consecutive hops in one
      // answer don't retrace the same curve.
      bend: Math.random() < 0.5 ? -1 : 1,
      start: performance.now(),
      popped: false,
    };
    canvas.classList.add("is-flying");
    if (!rafId) rafId = requestAnimationFrame(step);
  };

  // A canvas only ever hands out one context type, so swapping renderers
  // means swapping the element too.
  const swapCanvas = () => {
    const replacement = document.createElement("canvas");
    replacement.className = canvas.className;
    replacement.setAttribute("aria-hidden", "true");
    replacement.width = canvas.width;
    replacement.height = canvas.height;
    canvas.replaceWith(replacement);
    canvas = replacement;
    return canvas;
  };

  // Recorded on the element as data-renderer="webgpu" | "canvas2d" — the
  // canvas can't be asked which context it holds without claiming one, so
  // this is the only way to tell which path a session took.
  const adopt = (created) => {
    renderer = created;
    if (renderer) canvas.dataset.renderer = renderer.kind;
    return renderer;
  };

  const useCanvas2D = () => {
    const created = adopt(createCanvas2DRenderer(swapCanvas()));
    rendererPromise = Promise.resolve(created);
    return created;
  };

  // Renderer setup is deferred to the first focus event: no GPU device is
  // requested for a visitor who never triggers a highlight. If the device
  // is later lost — driver reset, backgrounded tab, too many contexts —
  // the next flight quietly drops to Canvas2D for the rest of the session
  // rather than the firefly just never appearing again.
  const ensureRenderer = () => {
    if (renderer && renderer.lost) return Promise.resolve(useCanvas2D());
    if (rendererPromise) return rendererPromise;
    document.body.append(canvas);
    resize();
    rendererPromise = createWebGPURenderer(canvas)
      .catch((error) => {
        console.warn("Guide sprite: WebGPU unavailable, falling back to canvas.", error);
        return null;
      })
      .then((gpu) => (gpu ? adopt(gpu) : useCanvas2D()));
    return rendererPromise;
  };

  document.addEventListener("site-focus", (event) => {
    const element = event.detail && event.detail.element;
    if (!element) return;
    // Let the smooth scroll get underway first — the firefly should look
    // like it's leading the page, not landing before the page moves.
    ensureRenderer().then((created) => {
      if (created) setTimeout(() => launch(element), 90);
    });
  });

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
  });
})();
