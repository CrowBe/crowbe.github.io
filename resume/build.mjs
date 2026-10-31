// Builds Ben's resume from resume.json, the single source of truth.
//
//   dist/Benjamin_Crow_Resume.pdf   site-styled (Familjen Grotesk + Literata,
//                                   embedded), single column, A4. Copied to
//                                   ../resources/ — the file the site links to.
//   dist/Benjamin_Crow_Resume.docx  same content in standard fonts (Arial +
//                                   Georgia) for job portals, which parse .docx
//                                   most reliably.
//   dist/resume.html                the page the PDF is printed from.
//
// ATS rules applied to both (from the resumeskills formatter/optimizer
// guidance): one column, no tables or text boxes, nothing in page
// headers/footers, contact details in the body, standard section names,
// real text only, consistent "Mon YYYY" dates, plain bullets. Ligatures are
// switched off in the PDF so words like "workflow" extract as plain letters.
//
// Usage:  npm install && npx playwright install chromium && npm run build

import { readFile, writeFile, mkdir, copyFile, rename } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const docx = require("docx");
const { chromium } = require("playwright");

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, "dist");
const BASENAME = "Benjamin_Crow_Resume";
const SITE_PDF = path.join(here, "..", "resources", `${BASENAME}.pdf`);

const resume = JSON.parse(await readFile(path.join(here, "resume.json"), "utf8"));

// ── Shared palette (light theme of the site) ───────────────────
const C = {
  ink: "16193e",
  text: "2d3254",
  muted: "535977",
  rule: "cad0e5",
  coral: "ba3535",
};

const SECTIONS = {
  summary: "Summary",
  skills: "Skills",
  work: "Work Experience",
  projects: "Projects",
  writing: "Writing",
  education: "Education",
};

const dateRange = (start, end) => (end ? `${start} – ${end}` : start);

// ════════════════════════════════════════════════════════════════
// PDF (HTML printed by Chromium)
// ════════════════════════════════════════════════════════════════
const esc = (value) =>
  String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);

const link = ({ url, text }) => `<a href="${esc(url)}">${esc(text)}</a>`;

const renderHtml = (r) => {
  const b = r.basics;
  const contact = [esc(b.location), `<a href="mailto:${esc(b.email)}">${esc(b.email)}</a>`, ...b.links.map(link)].join(
    '<span class="sep"> | </span>'
  );

  const skills = r.skills
    .map((group) => `<p class="skill"><span class="skill-name">${esc(group.name)}:</span> ${group.items.map(esc).join(", ")}</p>`)
    .join("\n");

  const work = r.work
    .map(
      (org) => `
      <div class="org">
        <h3 class="org-name">${esc(org.company)}<span class="org-meta">, ${esc(org.location)}</span></h3>
        ${org.stack ? `<p class="stack">Stack: ${esc(org.stack)}</p>` : ""}
        ${org.roles
          .map(
            (role) => `
          <div class="role">
            <h4 class="role-line"><span class="role-title">${esc(role.title)}</span><span class="dates">${esc(
              dateRange(role.start, role.end)
            )}</span></h4>
            <ul>${role.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
          </div>`
          )
          .join("")}
      </div>`
    )
    .join("\n");

  const projects = r.projects
    .map(
      (p) => `
      <div class="project">
        <p class="project-line"><span class="project-name">${esc(p.name)}</span><span class="project-meta"> | ${esc(
          p.status
        )} | ${esc(p.stack)} | ${link(p.link)}</span></p>
        <p class="project-summary">${esc(p.summary)}</p>
      </div>`
    )
    .join("\n");

  const writing = `
      <p class="writing-note">${link(r.writing.link)}. ${esc(r.writing.note)}</p>
      <ul>${r.writing.series
        .map((s) => `<li><span class="strong">${esc(s.name)}</span> (${esc(s.date)}): ${esc(s.summary)}</li>`)
        .join("")}</ul>`;

  const education = r.education
    .map(
      (e) => `
      <div class="edu">
        <h4 class="role-line"><span class="role-title">${esc(e.qualification)}, ${esc(e.institution)}</span><span class="dates">${esc(
          e.dates
        )}</span></h4>
        ${e.detail ? `<p class="stack">${esc(e.detail)}</p>` : ""}
      </div>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(b.name)} — Resume</title>
<meta name="author" content="${esc(b.name)}">
<style>
  /* Static (non-variable) fonts on purpose: Chromium embeds variable fonts
     as Type 3, which some ATS parsers read badly; static ones embed as
     ordinary TrueType with a full Unicode map. */
  @font-face { font-family: "Familjen Grotesk"; src: url("../fonts/familjen-grotesk-latin-500-normal.woff2") format("woff2"); font-weight: 500; font-style: normal; }
  @font-face { font-family: "Familjen Grotesk"; src: url("../fonts/familjen-grotesk-latin-600-normal.woff2") format("woff2"); font-weight: 600; font-style: normal; }
  @font-face { font-family: "Familjen Grotesk"; src: url("../fonts/familjen-grotesk-latin-700-normal.woff2") format("woff2"); font-weight: 700; font-style: normal; }
  @font-face { font-family: "Literata"; src: url("../fonts/literata-latin-400-normal.woff2") format("woff2"); font-weight: 400; font-style: normal; }
  @font-face { font-family: "Literata"; src: url("../fonts/literata-latin-400-italic.woff2") format("woff2"); font-weight: 400; font-style: italic; }

  @page { size: A4; margin: 14mm 16mm 13mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0;
    font-family: "Literata", Georgia, serif;
    font-size: 9.5pt;
    line-height: 1.42;
    color: #${C.text};
    /* plain letters in the text layer: no fi/fl/ffi ligature glyphs */
    font-variant-ligatures: none;
    font-feature-settings: "liga" 0, "clig" 0, "dlig" 0;
  }
  h1, h2, h3, h4, .grot { font-family: "Familjen Grotesk", Arial, sans-serif; }
  a { color: inherit; text-decoration: none; }
  p { margin: 0; }

  .name { margin: 0; font-size: 24pt; font-weight: 700; letter-spacing: -0.02em; line-height: 1.05; color: #${C.coral}; }
  .label { margin-top: 2pt; font-family: "Familjen Grotesk", Arial, sans-serif; font-size: 12.5pt; font-weight: 600; color: #${C.ink}; }
  .contact { margin-top: 4pt; font-family: "Familjen Grotesk", Arial, sans-serif; font-size: 9pt; color: #${C.muted}; }
  .contact .sep { color: #${C.rule}; }

  h2 {
    margin: 11pt 0 5pt;
    padding-bottom: 2.5pt;
    border-bottom: 0.75pt solid #${C.rule};
    font-size: 11.5pt;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: #${C.ink};
    break-after: avoid;
  }

  .skill { margin: 1.5pt 0; }
  .skill-name, .strong { font-family: "Familjen Grotesk", Arial, sans-serif; font-weight: 600; color: #${C.ink}; }

  .org { margin-top: 7pt; }
  .org:first-child { margin-top: 0; }
  .org-name { margin: 0; font-size: 10.8pt; font-weight: 700; color: #${C.ink}; break-after: avoid; }
  .org-meta { font-weight: 500; color: #${C.muted}; }
  .stack { font-family: "Familjen Grotesk", Arial, sans-serif; font-size: 8.6pt; color: #${C.muted}; break-after: avoid; }
  .role { margin-top: 4pt; }
  li { break-inside: avoid; }
  .role-line {
    display: flex; justify-content: space-between; align-items: baseline; gap: 12pt;
    margin: 0; font-size: 10pt; font-weight: 600; color: #${C.ink}; break-after: avoid;
  }
  .dates { flex-shrink: 0; font-size: 9pt; font-weight: 500; color: #${C.muted}; font-variant-numeric: tabular-nums; }

  ul { margin: 2pt 0 0; padding-left: 11pt; }
  li { margin: 1.6pt 0; padding-left: 2pt; }
  li::marker { color: #${C.coral}; }

  .project { margin-top: 4.5pt; break-inside: avoid; }
  .project-name { font-family: "Familjen Grotesk", Arial, sans-serif; font-size: 10pt; font-weight: 700; color: #${C.ink}; }
  .project-meta { font-family: "Familjen Grotesk", Arial, sans-serif; font-size: 8.8pt; color: #${C.muted}; }

  .writing-note { color: #${C.text}; }
  .edu { margin-top: 3pt; }
</style>
</head>
<body>
  <h1 class="name">${esc(b.name)}</h1>
  <p class="label">${esc(b.label)}</p>
  <p class="contact">${contact}</p>

  <section><h2>${SECTIONS.summary}</h2><p>${esc(r.summary)}</p></section>
  <section><h2>${SECTIONS.skills}</h2>${skills}</section>
  <section><h2>${SECTIONS.work}</h2>${work}</section>
  <section><h2>${SECTIONS.projects}</h2>${projects}</section>
  <section><h2>${SECTIONS.writing}</h2>${writing}</section>
  <section><h2>${SECTIONS.education}</h2>${education}</section>
</body>
</html>`;
};

// ════════════════════════════════════════════════════════════════
// DOCX (docx-js) — standard fonts, same structure
// ════════════════════════════════════════════════════════════════
const {
  Document, Packer, Paragraph, TextRun, ExternalHyperlink, AlignmentType, BorderStyle,
  LevelFormat, TabStopType,
} = docx;

const HEAD = "Arial";
const BODY = "Georgia";
const pt = (n) => Math.round(n * 2); // docx sizes are half-points
const MARGIN = 850; // ~15mm in twips
const TEXT_WIDTH = 11906 - MARGIN * 2; // A4 width minus margins

const run = (text, opts = {}) =>
  new TextRun({ text, font: opts.font || BODY, size: pt(opts.size || 10), bold: opts.bold, italics: opts.italics, color: opts.color || C.text });

const hyperlink = (url, text, opts = {}) =>
  new ExternalHyperlink({ link: url, children: [run(text, { font: HEAD, size: 9, color: C.muted, ...opts })] });

const sectionHeading = (text) =>
  new Paragraph({
    spacing: { before: 200, after: 80 },
    keepNext: true,
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.rule, space: 2 } },
    children: [run(text, { font: HEAD, size: 11.5, bold: true, color: C.ink })],
  });

const titleWithDates = (title, dates, before = 60) =>
  new Paragraph({
    spacing: { before, after: 20 },
    keepNext: true,
    tabStops: [{ type: TabStopType.RIGHT, position: TEXT_WIDTH }],
    children: [run(title, { font: HEAD, size: 10, bold: true, color: C.ink }), run(`\t${dates}`, { font: HEAD, size: 9, color: C.muted })],
  });

const bullet = (text) =>
  new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 30, line: 252 }, children: [run(text)] });

const smallLine = (text, keepNext = true) =>
  new Paragraph({ spacing: { after: 20 }, keepNext, children: [run(text, { font: HEAD, size: 8.5, color: C.muted })] });

const renderDocx = (r) => {
  const b = r.basics;
  const children = [];

  children.push(new Paragraph({ children: [run(b.name, { font: HEAD, size: 22, bold: true, color: C.coral })] }));
  children.push(new Paragraph({ spacing: { after: 40 }, children: [run(b.label, { font: HEAD, size: 12, bold: true, color: C.ink })] }));
  const contactRuns = [run(b.location, { font: HEAD, size: 9, color: C.muted })];
  const sep = () => run(" | ", { font: HEAD, size: 9, color: C.muted });
  contactRuns.push(sep(), hyperlink(`mailto:${b.email}`, b.email));
  for (const l of b.links) contactRuns.push(sep(), hyperlink(l.url, l.text));
  children.push(new Paragraph({ children: contactRuns }));

  children.push(sectionHeading(SECTIONS.summary));
  children.push(new Paragraph({ spacing: { line: 252 }, children: [run(r.summary)] }));

  children.push(sectionHeading(SECTIONS.skills));
  for (const group of r.skills) {
    children.push(
      new Paragraph({
        spacing: { after: 30 },
        children: [run(`${group.name}: `, { font: HEAD, size: 9.5, bold: true, color: C.ink }), run(group.items.join(", "))],
      })
    );
  }

  children.push(sectionHeading(SECTIONS.work));
  r.work.forEach((org, i) => {
    children.push(
      new Paragraph({
        spacing: { before: i === 0 ? 0 : 140, after: 10 },
        keepNext: true,
        children: [run(org.company, { font: HEAD, size: 10.5, bold: true, color: C.ink }), run(`, ${org.location}`, { font: HEAD, size: 10, color: C.muted })],
      })
    );
    if (org.stack) children.push(smallLine(`Stack: ${org.stack}`));
    for (const role of org.roles) {
      children.push(titleWithDates(role.title, dateRange(role.start, role.end)));
      for (const h of role.highlights) children.push(bullet(h));
    }
  });

  children.push(sectionHeading(SECTIONS.projects));
  for (const p of r.projects) {
    children.push(
      new Paragraph({
        spacing: { before: 60, after: 10 },
        keepNext: true,
        children: [
          run(p.name, { font: HEAD, size: 10, bold: true, color: C.ink }),
          run(` | ${p.status} | ${p.stack} | `, { font: HEAD, size: 9, color: C.muted }),
          hyperlink(p.link.url, p.link.text),
        ],
      })
    );
    children.push(new Paragraph({ spacing: { after: 30, line: 252 }, children: [run(p.summary)] }));
  }

  children.push(sectionHeading(SECTIONS.writing));
  children.push(new Paragraph({ spacing: { after: 30 }, children: [hyperlink(r.writing.link.url, r.writing.link.text, { font: BODY, size: 9.5, color: C.text }), run(`. ${r.writing.note}`)] }));
  for (const s of r.writing.series) {
    children.push(
      new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 30 },
        children: [run(s.name, { font: HEAD, size: 9.5, bold: true, color: C.ink }), run(` (${s.date}): ${s.summary}`)],
      })
    );
  }

  children.push(sectionHeading(SECTIONS.education));
  for (const e of r.education) {
    children.push(titleWithDates(`${e.qualification}, ${e.institution}`, e.dates, 40));
    if (e.detail) children.push(smallLine(e.detail, false));
  }

  return new Document({
    creator: b.name,
    title: `${b.name} — Resume`,
    styles: { default: { document: { run: { font: BODY, size: pt(10), color: C.text } } } },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 300, hanging: 220 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 800, bottom: 760, left: MARGIN, right: MARGIN } } },
        children,
      },
    ],
  });
};

// ════════════════════════════════════════════════════════════════
await mkdir(dist, { recursive: true });

const htmlPath = path.join(dist, "resume.html");
await writeFile(htmlPath, renderHtml(resume));

const pdfPath = path.join(dist, `${BASENAME}.pdf`);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const missing = await page.evaluate(() =>
    ["Familjen Grotesk", "Literata"].filter((f) => !document.fonts.check(`12px "${f}"`))
  );
  if (missing.length) throw new Error(`Fonts failed to load: ${missing.join(", ")}`);
  await page.pdf({ path: pdfPath, format: "A4", preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
} finally {
  await browser.close();
}

// Optional lossless squeeze (~35% smaller): object streams + max deflate.
// Text, fonts and links are untouched. Skipped quietly if qpdf isn't installed.
try {
  const squeezed = `${pdfPath}.tmp`;
  execFileSync("qpdf", ["--object-streams=generate", "--compress-streams=y", "--recompress-flate", "--compression-level=9", pdfPath, squeezed], { stdio: "ignore" });
  await rename(squeezed, pdfPath);
} catch {
  console.log("qpdf not found: PDF left uncompressed (install qpdf for a ~35% smaller file).");
}
await copyFile(pdfPath, SITE_PDF);

const docxPath = path.join(dist, `${BASENAME}.docx`);
await writeFile(docxPath, await Packer.toBuffer(renderDocx(resume)));

console.log(`Built:\n  ${path.relative(process.cwd(), pdfPath)}\n  ${path.relative(process.cwd(), docxPath)}\n  copied PDF to ${path.relative(process.cwd(), SITE_PDF)}`);
