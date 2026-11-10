// The designed resume: for people, not parsers. Rendered from the same
// resume.json as the ATS files, so the two can never say different things.
//
// It carries the portfolio's identity onto paper:
//   · a band cut from the site's hero shader (assets/header-night.jpg,
//     made by render-header.mjs) with the name and the hero's prompt line
//   · the career route from the site: big start-years, a wandering dotted
//     trail, a coral "now" waypoint. The trail runs off the bottom of page 1
//     and picks up again at the top of page 2.
//   · project screenshots, and the two essay series as real 1-2-3 lists
//
// Pages are laid out explicitly (two fixed A4 sheets). A script in the page
// moves experience stops that don't fit on page 1 to page 2, draws the
// trails, and sets window.__resumeReady — or an error message if page 2
// overflows — which build.mjs waits on before printing.

const esc = (value) =>
  String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);

const yearOf = (start) => (String(start).match(/\d{4}/) || [""])[0];
const range = (start, end) => (end ? `${start} – ${end}` : start);

export const renderDesignedHtml = (r, { root = "../.." } = {}) => {
  const b = r.basics;
  const asset = (p) => `${root}/${p}`;
  const portfolio = b.links.find((l) => l.label === "Portfolio") || b.links[0];

  // Flatten the work history into route stops, newest first. The stack line
  // goes on the first (most recent) stop for each organisation.
  const stops = r.work.flatMap((org) =>
    org.roles.map((role, i) => ({
      year: yearOf(role.start),
      range: range(role.start, role.end),
      title: role.title,
      org: org.short || org.company,
      location: org.location,
      stack: i === 0 ? org.stack : null,
      highlights: role.highlights,
      now: /present/i.test(role.end || ""),
    }))
  );

  const stopHtml = (s) => `
        <li class="stop${s.now ? " is-now" : ""}">
          <p class="when"><span class="year">${esc(s.year)}</span><span class="range">${esc(s.range)}</span></p>
          <div class="what">
            <h3 class="role">${esc(s.title)}</h3>
            <p class="org"><span class="org-name">${esc(s.org)}</span><span class="org-loc">${esc(s.location)}</span></p>
            ${s.stack ? `<p class="stack">${esc(s.stack)}</p>` : ""}
            <ul class="points">${s.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
          </div>
        </li>`;

  const skills = r.skills
    .map(
      (g) => `
          <div class="skill-group">
            <h4>${esc(g.name)}</h4>
            <p>${g.items.map(esc).join(", ")}</p>
          </div>`
    )
    .join("");

  const education = r.education
    .map(
      (e) => `
          <div class="edu">
            <h4>${esc(e.qualification)}</h4>
            <p class="edu-where">${esc(e.institution)}<span>${esc(e.dates)}</span></p>
            ${e.detail ? `<p class="edu-detail">${esc(e.detail)}</p>` : ""}
          </div>`
    )
    .join("");

  const contact = [
    `<a href="mailto:${esc(b.email)}">${esc(b.email)}</a>`,
    ...b.links.map((l) => `<a href="${esc(l.url)}">${esc(l.text)}</a>`),
  ]
    .map((a) => `<li>${a}</li>`)
    .join("");

  const projects = r.projects
    .map(
      (p) => `
        <article class="project">
          <div class="shot">${p.image ? `<img src="${esc(asset(p.image))}" alt="${esc(p.imageAlt || p.name)}">` : ""}</div>
          <div class="project-text">
            <h3>${esc(p.name)}<span class="status">${esc(p.status)}</span></h3>
            <p class="project-stack">${esc(p.stack)}</p>
            <p class="project-summary">${esc(p.tagline || p.summary)}</p>
            <p class="project-link"><a href="${esc(p.link.url)}">${esc(p.link.text)}</a></p>
          </div>
        </article>`
    )
    .join("");

  const series = r.writing.series
    .map(
      (s) => `
          <div class="series">
            <h4>${esc(s.name)}</h4>
            <p class="series-meta">Three-part series, ${esc(s.date)}</p>
            <ol>${(s.parts || [])
              .map((part) => `<li><a href="${esc(part.url)}">${esc(part.title)}</a></li>`)
              .join("")}</ol>
          </div>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(b.name)} — Resume</title>
<meta name="author" content="${esc(b.name)}">
<style>
  /* Night route: the site's hero palette on paper.
     night #151739 · ink #16193e · text #2d3254 · muted #535977
     glow #3c54a3 (years, links) · trail #7f90cf · coral #f95f5b / #ba3535 (now) */
  @font-face { font-family: "Familjen Grotesk"; src: url("../fonts/familjen-grotesk-latin-500-normal.woff2") format("woff2"); font-weight: 500; }
  @font-face { font-family: "Familjen Grotesk"; src: url("../fonts/familjen-grotesk-latin-600-normal.woff2") format("woff2"); font-weight: 600; }
  @font-face { font-family: "Familjen Grotesk"; src: url("../fonts/familjen-grotesk-latin-700-normal.woff2") format("woff2"); font-weight: 700; }
  @font-face { font-family: "Literata"; src: url("../fonts/literata-latin-400-normal.woff2") format("woff2"); font-weight: 400; font-style: normal; }
  @font-face { font-family: "Literata"; src: url("../fonts/literata-latin-400-italic.woff2") format("woff2"); font-weight: 400; font-style: italic; }
  @font-face { font-family: "Fira Code"; src: url("../fonts/fira-code-latin-400-normal.woff2") format("woff2"); font-weight: 400; }

  :root {
    --night: #151739;
    --ink: #16193e;
    --text: #2d3254;
    --muted: #5a6080;
    --rule: #dde2f2;
    --surface: #eef1fa;
    --glow: #3c54a3;
    --trail: #7f90cf;
    --coral: #f95f5b;
    --coral-text: #ba3535;
    --moon: #eceef9;
    --moon-2: #c9cfe8;
    --periwinkle: #acbaf5;

    --display: "Familjen Grotesk", Arial, sans-serif;
    --serif: "Literata", Georgia, serif;
    --mono: "Fira Code", ui-monospace, monospace;

    --gutter: 14mm;
    --rail: 50mm;
    --gap: 10mm;
    --year-col: 21mm;
    --trail-col: 9mm;
  }

  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; background: #fff; color: var(--text); font-family: var(--serif); font-size: 8.35pt; line-height: 1.4; }
  h1, h2, h3, h4 { margin: 0; font-family: var(--display); color: var(--ink); font-weight: 600; text-wrap: balance; }
  p, ul, ol { margin: 0; }
  a { color: inherit; text-decoration: none; }

  .page {
    position: relative;
    width: 210mm;
    height: 297mm;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    break-after: page;
  }
  .page:last-child { break-after: auto; }

  /* ── Page 1 band ───────────────────────────────────────────── */
  .band {
    position: relative;
    flex: none;
    height: 56mm;
    padding: 0 var(--gutter) 8mm;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 10mm;
    color: var(--moon);
    background:
      linear-gradient(90deg, rgba(13, 2, 33, 0.62) 0%, rgba(13, 2, 33, 0.28) 55%, rgba(13, 2, 33, 0.5) 100%),
      linear-gradient(180deg, rgba(13, 2, 33, 0.15) 0%, rgba(13, 2, 33, 0) 40%, rgba(13, 2, 33, 0.35) 100%),
      url("../assets/header-night.jpg") center / cover no-repeat,
      var(--night);
  }
  .band h1 {
    font-size: 32pt;
    font-weight: 700;
    letter-spacing: -0.035em;
    line-height: 0.95;
    color: var(--moon);
  }
  .band .title {
    margin-top: 2.6mm;
    font-family: var(--display);
    font-size: 13pt;
    font-weight: 500;
    color: var(--periwinkle);
  }
  .band .prompt {
    margin-top: 4mm;
    font-family: var(--mono);
    font-size: 8pt;
    letter-spacing: 0.02em;
    color: var(--moon-2);
  }
  .band .prompt .glyph { color: var(--coral); }
  .band .prompt .caret {
    display: inline-block;
    width: 0.55em;
    height: 1.05em;
    margin-left: 0.35em;
    vertical-align: text-bottom;
    background: var(--coral);
  }
  .contact {
    list-style: none;
    padding: 0;
    text-align: right;
    font-family: var(--display);
    font-size: 8.4pt;
    font-weight: 500;
    line-height: 1.6;
    color: var(--moon-2);
  }

  /* ── Page 2 strip ──────────────────────────────────────────── */
  .strip {
    flex: none;
    height: 12mm;
    padding: 0 var(--gutter);
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: var(--display);
    font-size: 8.4pt;
    font-weight: 500;
    color: var(--moon-2);
    background:
      linear-gradient(90deg, rgba(13, 2, 33, 0.55), rgba(13, 2, 33, 0.3)),
      url("../assets/header-night.jpg") center 70% / cover no-repeat,
      var(--night);
  }
  .strip strong { font-weight: 700; color: var(--moon); font-size: 10pt; letter-spacing: -0.01em; }
  .strip-contact { display: flex; gap: 6mm; }
  .p2 .body { padding-top: 7mm; }

  /* ── Two-column body ───────────────────────────────────────── */
  .body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) var(--rail);
    column-gap: var(--gap);
    padding: 8mm var(--gutter) 0;
    align-items: start;
  }
  .p1 .body { flex: 1; min-height: 0; }
  .rail { display: grid; gap: 7mm; padding-top: 1mm; }

  .lead {
    font-size: 10pt;
    line-height: 1.46;
    color: var(--ink);
  }
  .section-title {
    font-size: 11pt;
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  .main > .section-title { margin: 6mm 0 3.6mm; }
  .rail .section-title { margin-bottom: 2.6mm; }

  /* ── The route ─────────────────────────────────────────────── */
  .route {
    position: relative;
    list-style: none;
    padding: 0;
  }
  .route-line {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
  }
  .route-line path {
    fill: none;
    stroke: var(--trail);
    stroke-width: 2.3;
    stroke-linecap: round;
    stroke-dasharray: 0.1 6.4;
  }
  .stop {
    position: relative;
    display: grid;
    grid-template-columns: var(--year-col) var(--trail-col) minmax(0, 1fr);
    padding-bottom: 4.2mm;
  }
  .stop::before {
    content: "";
    position: absolute;
    left: calc(var(--year-col) + var(--trail-col) / 2 - 1.55mm);
    top: 1.15mm;
    width: 3.1mm;
    height: 3.1mm;
    border-radius: 50%;
    background: #fff;
    border: 0.55mm solid var(--trail);
    z-index: 1;
  }
  .stop.is-now::before {
    background: var(--coral);
    border-color: var(--coral);
    box-shadow: 0 0 0 1.5mm rgba(249, 95, 91, 0.2), 0 0 4mm 1mm rgba(249, 95, 91, 0.38);
  }
  .when {
    grid-column: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    text-align: right;
    font-family: var(--display);
    font-variant-numeric: tabular-nums;
    line-height: 1;
  }
  .year {
    font-size: 16pt;
    font-weight: 700;
    letter-spacing: -0.04em;
    color: var(--glow);
  }
  .is-now .year { color: var(--coral-text); }
  .range {
    margin-top: 1.4mm;
    font-size: 6.6pt;
    font-weight: 500;
    color: var(--muted);
    white-space: nowrap;
  }
  .what { grid-column: 3; }
  .role { font-size: 10.2pt; font-weight: 600; letter-spacing: -0.012em; line-height: 1.25; padding-top: 0.4mm; }
  .org { margin-top: 0.5mm; display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 2.2mm; }
  .org-name { font-style: italic; color: var(--text); }
  .org-loc { font-family: var(--display); font-size: 7.2pt; font-weight: 500; color: var(--muted); }
  .stack { margin-top: 0.6mm; font-family: var(--display); font-size: 7.2pt; font-weight: 500; color: var(--muted); }
  .points { list-style: none; padding: 0; margin-top: 1.3mm; display: grid; gap: 0.9mm; }
  .points li { position: relative; padding-left: 3.4mm; }
  .points li::before {
    content: "";
    position: absolute;
    left: 0.4mm;
    top: 0.62em;
    width: 1.25mm;
    height: 1.25mm;
    border-radius: 50%;
    background: var(--trail);
  }
  .is-now .points li::before { background: var(--coral); }
  .stop.cont::before { display: none; }
  .cont .points { margin-top: 0; }
  .cont-label { font-family: var(--display); font-size: 7.2pt; font-weight: 500; color: var(--muted); margin-bottom: 1mm; }

  /* ── Rail ──────────────────────────────────────────────────── */
  .skill-group + .skill-group { margin-top: 3mm; }
  .skill-group h4, .edu h4, .series h4 { font-size: 8.4pt; font-weight: 600; letter-spacing: -0.005em; }
  .skill-group p { margin-top: 0.6mm; font-size: 8.1pt; line-height: 1.45; }
  .edu + .edu { margin-top: 3mm; }
  .edu-where { margin-top: 0.4mm; font-style: italic; font-size: 8.1pt; }
  .edu-where span { display: block; font-style: normal; font-family: var(--display); font-size: 7.2pt; font-weight: 500; color: var(--muted); }
  .edu-detail { font-family: var(--display); font-size: 7.2pt; font-weight: 500; color: var(--muted); }

  .series + .series { margin-top: 4.5mm; }
  .series-meta { font-family: var(--display); font-size: 7.2pt; font-weight: 500; color: var(--muted); }
  .series ol { list-style: none; padding: 0; margin-top: 1.8mm; display: grid; gap: 1.6mm; counter-reset: part; }
  .series li { counter-increment: part; position: relative; padding-left: 5.2mm; font-size: 8.1pt; line-height: 1.35; color: var(--ink); }
  .series li::before {
    content: counter(part);
    position: absolute;
    left: 0;
    top: -0.3mm;
    font-family: var(--display);
    font-size: 11pt;
    font-weight: 700;
    line-height: 1;
    color: var(--glow);
  }
  .series li:first-child::before { color: var(--coral-text); }
  .writing-note { margin-top: 4.5mm; font-size: 7.4pt; font-style: italic; color: var(--muted); }
  .writing-link { margin-top: 1mm; font-family: var(--display); font-size: 7.6pt; font-weight: 600; color: var(--glow); }

  /* ── Projects (page 2, full width) ─────────────────────────── */
  .projects { padding: 2mm var(--gutter) 0; }
  .projects .section-title { margin-bottom: 3.4mm; }
  .project-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm 8mm; }
  .project { display: grid; grid-template-columns: 31mm minmax(0, 1fr); gap: 3.6mm; align-items: start; }
  .shot {
    height: 22mm;
    border-radius: 2mm;
    background: var(--surface);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.6mm;
    overflow: hidden;
  }
  .shot img { max-width: 100%; max-height: 100%; border-radius: 1mm; display: block; }
  .project h3 { font-size: 10pt; font-weight: 700; letter-spacing: -0.015em; display: flex; align-items: baseline; gap: 2mm; }
  .status { font-size: 6.8pt; font-weight: 500; color: var(--muted); letter-spacing: 0; }
  .project-stack { margin-top: 0.5mm; font-family: var(--display); font-size: 7pt; font-weight: 500; color: var(--muted); }
  .project-summary { margin-top: 1mm; font-size: 7.7pt; line-height: 1.38; }
  .project-link { margin-top: 1mm; font-family: var(--display); font-size: 7.2pt; font-weight: 600; color: var(--glow); }

</style>
</head>
<body>

  <section class="page p1">
    <header class="band">
      <div>
        <h1>${esc(b.name)}</h1>
        <p class="title">${esc(b.label)}</p>
        <p class="prompt"><span class="glyph">~</span> building with agents in ${esc(b.location.split(",")[0])}<span class="caret"></span></p>
      </div>
      <ul class="contact">${contact}</ul>
    </header>

    <div class="body">
      <div class="main">
        <p class="lead">${esc(r.summary)}</p>
        <h2 class="section-title">Experience</h2>
        <ol class="route" data-route="1">${stops.map(stopHtml).join("")}
        </ol>
      </div>
      <aside class="rail">
        <section>
          <h2 class="section-title">Skills</h2>${skills}
        </section>
        <section>
          <h2 class="section-title">Education</h2>${education}
        </section>
      </aside>
    </div>
  </section>

  <section class="page p2">
    <header class="strip"><strong>${esc(b.name)}</strong><span class="strip-contact"><a href="mailto:${esc(b.email)}">${esc(b.email)}</a><a href="${esc(portfolio.url)}">${esc(portfolio.text)}</a></span></header>

    <div class="body">
      <div class="main">
        <ol class="route" data-route="2"></ol>
      </div>
      <aside class="rail">
        <section>
          <h2 class="section-title">Writing</h2>${series}
          <p class="writing-note">${esc(r.writing.note)}</p>
          <p class="writing-link"><a href="${esc(r.writing.link.url)}">${esc(r.writing.link.text)}</a></p>
        </section>
      </aside>
    </div>

    <section class="projects">
      <h2 class="section-title">Projects</h2>
      <div class="project-grid">${projects}
      </div>
    </section>

  </section>

<script>
(async () => {
  const MM = 96 / 25.4;
  try {
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));

    // 1. Pagination: keep the route on page 1 until it would cross the
    //    bottom margin, then carry the remaining stops to page 2.
    const p1 = document.querySelector(".p1");
    const p2 = document.querySelector(".p2");
    const route1 = p1.querySelector('[data-route="1"]');
    const route2 = p2.querySelector('[data-route="2"]');
    const limit1 = p1.getBoundingClientRect().bottom - 11 * MM;
    const bottomOf = (stop) => stop.querySelector(".what").getBoundingClientRect().bottom;
    while (route1.children.length > 1 && bottomOf(route1.lastElementChild) > limit1) {
      const last = route1.lastElementChild;
      const items = [...last.querySelectorAll(".points > li")];
      let keep = items.length;
      while (keep > 0 && items[keep - 1].getBoundingClientRect().bottom > limit1) keep--;
      if (keep >= 2) {
        // Split the role at a bullet: the rest carries over to page 2 under
        // a small "continued" label, with the trail running alongside.
        const cont = document.createElement("li");
        cont.className = "stop cont" + (last.classList.contains("is-now") ? " is-now" : "");
        cont.innerHTML = '<p class="when"></p><div class="what"><p class="cont-label"></p><ul class="points"></ul></div>';
        cont.querySelector(".cont-label").textContent = last.querySelector(".role").textContent + ", continued";
        items.slice(keep).forEach((li) => cont.querySelector(".points").append(li));
        route2.prepend(cont);
        break;
      }
      route2.prepend(last);
    }
    const rail1 = p1.querySelector(".rail");
    if (rail1.getBoundingClientRect().bottom > limit1) throw new Error("Page 1 rail (skills/education) is too tall");

    // 2. Trails: a wandering dotted line through each route's waypoints,
    //    running off the bottom of page 1 and back in at the top of page 2.
    const WOBBLE = [1, 0.65, 1.2, 0.8, 1.05, 0.7];
    const NS = "http://www.w3.org/2000/svg";
    const draw = (route, { leadIn = 0, leadOut = 0 } = {}) => {
      const stops = [...route.querySelectorAll(":scope > .stop:not(.cont)")];
      if (!stops.length) return;
      const box = route.getBoundingClientRect();
      const pts = stops.map((stop) => {
        const dot = getComputedStyle(stop, "::before");
        const r = stop.getBoundingClientRect();
        return { x: r.left - box.left + parseFloat(dot.left) + parseFloat(dot.width) / 2, y: r.top - box.top + parseFloat(dot.top) + parseFloat(dot.height) / 2 };
      });
      const x0 = pts[0].x;
      if (leadIn) pts.unshift({ x: x0, y: -leadIn });
      if (leadOut) pts.push({ x: x0, y: pts[pts.length - 1].y + leadOut });
      const reach = 3.2 * MM;
      let d = "M " + pts[0].x.toFixed(1) + " " + pts[0].y.toFixed(1);
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], dy = b.y - a.y;
        const s = (i % 2 === 0 ? 1 : -1) * Math.min(reach * WOBBLE[i % WOBBLE.length], dy * 0.14);
        d += " C " + (a.x + s).toFixed(1) + " " + (a.y + dy * 0.32).toFixed(1) + ", " + (b.x + s).toFixed(1) + " " + (b.y - dy * 0.32).toFixed(1) + ", " + b.x.toFixed(1) + " " + b.y.toFixed(1);
      }
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("class", "route-line");
      svg.setAttribute("aria-hidden", "true");
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", d);
      svg.append(path);
      route.prepend(svg);
    };
    const continues = route2.children.length > 0;
    const lastDotY1 = [...route1.querySelectorAll(":scope > .stop")].pop().getBoundingClientRect().top + 2.7 * MM;
    draw(route1, { leadOut: continues ? Math.max(limit1 + 9 * MM - lastDotY1, 0) : 0 });
    if (continues) draw(route2, { leadIn: 9 * MM });

    // 3. Page 2 must fit.
    const limit2 = p2.getBoundingClientRect().bottom - 10 * MM;
    const lastBlock = [p2.querySelector(".projects"), p2.querySelector(".body")].map((el) => el.getBoundingClientRect().bottom);
    const over = Math.max(...lastBlock) - limit2;
    if (over > 0) throw new Error("Page 2 overflows by " + (over / MM).toFixed(1) + "mm — trim content or tighten spacing");

    window.__resumeReady = true;
  } catch (error) {
    window.__resumeReady = String(error && error.message ? error.message : error);
  }
})();
</script>
</body>
</html>`;
};
