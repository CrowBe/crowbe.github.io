// Renders a still of the site's hero shader for the designed resume's header.
//
// The shader source is read straight out of ../resources/scripts/websitescripts.js,
// so if the hero changes, re-running this keeps the resume in step:
//
//   node render-header.mjs            # writes assets/header-night.jpg
//   node render-header.mjs --time 64  # pick a different moment of the flow
//
// The frame is rendered at the hero's own 16:10 shape (the shader's vignette
// is tuned for it) and the band the resume uses is cropped out of it.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? Number(process.argv[i + 1]) : fallback;
};

const TIME = arg("time", 38); // seconds into the flow
const MOUSE_X = arg("mx", 0.15); // a little of the pointer parallax, for shape
const MOUSE_Y = arg("my", -0.1);
const WIDTH = 2480; // A4 width at 300dpi
const HEIGHT = Math.round(WIDTH / 1.6);
const BAND_TOP = arg("top", 0.3); // where the cropped band starts, 0-1 of the frame
const BAND_RATIO = arg("ratio", 210 / 64); // band width / height (A4 width x header height)

const site = await readFile(path.join(here, "..", "resources", "scripts", "websitescripts.js"), "utf8");
const grab = (name) => {
  const match = site.match(new RegExp(`const ${name} = \`([\\s\\S]*?)\`;`));
  if (!match) throw new Error(`Couldn't find ${name} in websitescripts.js — has the hero shader moved?`);
  return match[1];
};
const VERT = grab("VERT");
const FRAG = grab("FRAG");

const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
try {
  const page = await browser.newPage();
  await page.setContent("<!doctype html><canvas></canvas>");
  const dataUrl = await page.evaluate(
    ({ VERT, FRAG, WIDTH, HEIGHT, TIME, MOUSE_X, MOUSE_Y, BAND_TOP, BAND_RATIO }) => {
      const canvas = document.querySelector("canvas");
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false });
      if (!gl) throw new Error("WebGL2 unavailable in this Chromium");
      const compile = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      gl.useProgram(prog);
      gl.viewport(0, 0, WIDTH, HEIGHT);
      gl.uniform2f(gl.getUniformLocation(prog, "u_res"), WIDTH, HEIGHT);
      gl.uniform1f(gl.getUniformLocation(prog, "u_time"), TIME);
      gl.uniform2f(gl.getUniformLocation(prog, "u_mouse"), MOUSE_X, MOUSE_Y);
      gl.uniform1f(gl.getUniformLocation(prog, "u_light"), 0); // the night palette
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      const bandHeight = Math.round(WIDTH / BAND_RATIO);
      const top = Math.round((HEIGHT - bandHeight) * BAND_TOP);
      const out = document.createElement("canvas");
      out.width = WIDTH;
      out.height = bandHeight;
      out.getContext("2d").drawImage(canvas, 0, top, WIDTH, bandHeight, 0, 0, WIDTH, bandHeight);
      return out.toDataURL("image/jpeg", 0.86);
    },
    { VERT, FRAG, WIDTH, HEIGHT, TIME, MOUSE_X, MOUSE_Y, BAND_TOP, BAND_RATIO }
  );
  await mkdir(path.join(here, "assets"), { recursive: true });
  const file = path.join(here, "assets", "header-night.jpg");
  await writeFile(file, Buffer.from(dataUrl.split(",")[1], "base64"));
  console.log(`Wrote ${path.relative(process.cwd(), file)} (time ${TIME})`);
} finally {
  await browser.close();
}
