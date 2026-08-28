// ── Agent → page focus surface ────────────────────────────────
// Builds an index of everything on the homepage worth pointing at
// (sections, project cards, writing cards, skill groups, individual
// technologies), resolves loose names onto it, and — when an agent or
// the chat widget names one — scrolls it into view and highlights it.
//
// Consumed by:
//   · site-tools.js  — WebMCP tools call focus() as a side effect, so an
//                      external agent asking "what has Ben built?" also
//                      moves the visitor's screen to the projects rail.
//   · ask-ben.js     — scans the question and the streaming answer for
//                      mentions and highlights each one as it comes up.
//   · guide-sprite.js — listens for the "site-focus" event and flies a
//                      firefly to the element to draw the eye there.
//
// Everything here is best-effort: an unknown name resolves to null and
// callers just carry on.
(() => {
  "use strict";

  const HIGHLIGHT_CLASS = "is-agent-focused";
  const HIGHLIGHT_MS = 4200;
  const QUEUE_GAP_MS = 1500;
  const MAX_QUEUE = 3;

  const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Normalise for matching: lowercase, strip punctuation that people and
  // models drift on ("agent.branch" / "agent branch" / "agentbranch").
  const normalise = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const squash = (value) => normalise(value).replace(/ /g, "");
  const text = (element) => (element ? element.textContent.replace(/\s+/g, " ").trim() : "");

  // Splitting a chip like "REST / GraphQL" or "Testing (Vitest, RSpec)" into
  // its parts produces some words that are ordinary English. Those stay
  // resolvable by name but are never scanned for in prose, or every answer
  // containing "the rest of" would highlight the REST chip.
  const GENERIC_PHRASES = new Set([
    "rest", "express", "testing", "cloud", "integration", "git", "api", "servers", "engineering", "context",
  ]);

  // Short forms people actually type for a couple of the longer chip names.
  const TECH_ALIASES = {
    "ruby on rails": ["rails"],
    postgresql: ["postgres"],
    "next js": ["nextjs"],
  };

  // ── Index ───────────────────────────────────────────────────
  // Each target: { id, kind, label, element, aliases[], phrases[] }
  //   aliases  — accepted by resolve() for a direct lookup
  //   phrases  — additionally scanned for by mentions(); kept separate so
  //              broad words ("react") can be resolvable without making
  //              every passing sentence trigger a highlight.
  const targets = [];
  const byId = new Map();

  const addTarget = (target) => {
    if (!target.element || byId.has(target.id)) return null;
    target.aliases = Array.from(
      new Set([target.id, target.label, ...(target.aliases || [])].map(normalise).filter(Boolean))
    );
    target.phrases = Array.from(
      new Set((target.phrases || [target.label]).map(normalise).filter((p) => p.length >= 3))
    );
    // mentions() runs on every streamed chunk of a chat reply, so the
    // squashed forms are derived once here rather than per call.
    target.squashedPhrases = target.phrases.filter((p) => p.length >= 6).map(squash);
    targets.push(target);
    byId.set(target.id, target);
    return target;
  };

  const slugFromHref = (href) => {
    try {
      return new URL(href, location.href).pathname.replace(/\/$/, "").split("/").pop().replace(/\.html$/, "");
    } catch (error) {
      return "";
    }
  };

  const buildIndex = () => {
    // Sections — the coarse "scroll me there" targets.
    const sections = [
      { id: "about", label: "About", aliases: ["about me", "bio", "background", "experience", "technologies", "tech stack"] },
      { id: "projects", label: "Projects", aliases: ["project", "work", "portfolio", "things ben built", "builds"] },
      { id: "writing", label: "Writing", aliases: ["articles", "article", "blog", "posts", "essays"] },
      { id: "contact", label: "Contact", aliases: ["contact me", "get in touch", "email", "resume", "cv", "hire"] },
    ];
    for (const section of sections) {
      addTarget({
        id: `section-${section.id}`,
        kind: "section",
        label: section.label,
        element: document.getElementById(section.id),
        aliases: [section.id, ...section.aliases],
        phrases: [],
      });
    }

    // Project cards — keyed off the heading id already in the markup.
    document.querySelectorAll(".project-card").forEach((card) => {
      const heading = card.querySelector(".card-header h3");
      const label = text(heading);
      if (!label) return;
      const id = (heading.id || "").replace(/^project-head-/, "") || squash(label);
      const tags = Array.from(card.querySelectorAll(".project-tags span"), text);
      const repo = card.querySelector(".project-links a[href*='github.com']");
      addTarget({
        id: `project-${id}`,
        kind: "project",
        label,
        element: card,
        aliases: [id, label, squash(label), repo ? slugFromHref(repo.getAttribute("href")) : "", ...tags],
        // Project names are distinctive enough to scan prose for; the
        // squashed form catches "agentbranch" as well as "agent.branch".
        phrases: [label, squash(label)],
      });
    });

    // Writing cards — slug from the article link.
    document.querySelectorAll(".writing-card").forEach((card) => {
      const link = card.querySelector(".writing-card-link");
      const label = text(card.querySelector(".card-header h3"));
      const slug = link ? slugFromHref(link.getAttribute("href")) : "";
      if (!label || !slug) return;
      addTarget({
        id: `writing-${slug}`,
        kind: "writing",
        label,
        element: card,
        aliases: [slug, label, text(card.querySelector(".writing-card-series"))],
        phrases: [label],
      });
    });

    // Skill groups and the individual technologies inside them.
    document.querySelectorAll(".tech-category").forEach((group) => {
      const label = text(group.querySelector("h4"));
      if (!label) return;
      addTarget({
        id: `skills-${squash(label)}`,
        kind: "skill-group",
        label: `${label} skills`,
        element: group,
        aliases: [label, `${label} skills`, `${label} stack`],
        phrases: [],
      });
      group.querySelectorAll("li").forEach((item) => {
        const tech = text(item);
        if (!tech) return;
        // Split "AWS / Cloud" and "Testing (Vitest, RSpec)" into the names
        // people actually say, then add the known short forms.
        const parts = tech
          .split(/\s*[/()]\s*|,\s*/)
          .map((part) => part.trim())
          .filter(Boolean)
          .concat(tech, TECH_ALIASES[normalise(tech)] || []);
        addTarget({
          id: `tech-${squash(tech)}`,
          kind: "tech",
          label: tech,
          element: item,
          aliases: [tech, squash(tech), ...parts],
          phrases: parts.filter((part) => !GENERIC_PHRASES.has(normalise(part))),
        });
      });
    });
  };

  // ── Resolution ──────────────────────────────────────────────
  const resolve = (query) => {
    const wanted = normalise(query);
    if (!wanted) return null;
    const squashed = squash(query);

    // Three tiers, strongest first. The label tier matters because a
    // project card also answers to its tag list, and "TypeScript" should
    // land on the TypeScript chip rather than the first card tagged with it.
    let alias = null;
    let partialBest = null;
    for (const target of targets) {
      if (normalise(target.label) === wanted || squash(target.label) === squashed) return target;
      if (!alias && (target.aliases.includes(wanted) || target.aliases.some((a) => squash(a) === squashed))) {
        alias = target;
      }
      // Partial match is a last resort, and the longest alias wins so
      // "hooks library" beats a bare "hooks".
      const partial = target.aliases.find(
        (a) => a.length >= 4 && (a.includes(wanted) || wanted.includes(a))
      );
      if (partial && (!partialBest || partial.length > partialBest.score)) {
        partialBest = { target, score: partial.length };
      }
    }
    return alias || (partialBest ? partialBest.target : null);
  };

  // Scan free text (a question, or a streaming answer) for targets it
  // names. Ordered by where they appear, so highlights follow the prose.
  // Sections are excluded: they're too generic to fire on a stray word,
  // and focusing a card scrolls its section into view anyway.
  const KIND_RANK = { project: 0, writing: 1, "skill-group": 2, tech: 3, section: 4 };
  const mentions = (input) => {
    const haystack = ` ${normalise(input)} `;
    const squashedHaystack = squash(input);
    const hits = [];
    for (const target of targets) {
      if (target.kind === "section") continue;
      let at = -1;
      for (const phrase of target.phrases) {
        const found = haystack.indexOf(` ${phrase} `);
        if (found !== -1 && (at === -1 || found < at)) at = found;
      }
      // "agent.branch" written as "agentbranch" survives normalisation
      // as one token, so check the squashed form too.
      if (at === -1 && target.squashedPhrases.some((p) => squashedHaystack.includes(p))) at = haystack.length;
      if (at !== -1) hits.push({ target, at });
    }
    hits.sort((a, b) => a.at - b.at || KIND_RANK[a.target.kind] - KIND_RANK[b.target.kind]);

    // Drop a technology that's only there because a project already
    // matched on it (highlighting "React" under a ClawFace answer is noise).
    const specific = hits.some((hit) => hit.target.kind === "project" || hit.target.kind === "writing");
    return hits
      .filter((hit) => !(specific && hit.target.kind === "tech"))
      .map((hit) => hit.target);
  };

  // ── Focus ───────────────────────────────────────────────────
  let liveRegion = null;
  const announce = (message) => {
    if (!liveRegion) {
      liveRegion = document.createElement("p");
      liveRegion.className = "agent-focus-live";
      liveRegion.setAttribute("role", "status");
      liveRegion.setAttribute("aria-live", "polite");
      document.body.append(liveRegion);
    }
    liveRegion.textContent = message;
  };

  let highlighted = null;
  let clearTimer = 0;

  const clear = () => {
    if (clearTimer) {
      clearTimeout(clearTimer);
      clearTimer = 0;
    }
    if (highlighted) {
      highlighted.classList.remove(HIGHLIGHT_CLASS);
      highlighted.removeAttribute("data-agent-focus");
      highlighted = null;
    }
  };

  const KIND_NOUN = {
    project: "project",
    writing: "article",
    "skill-group": "skills",
    tech: "technology",
    section: "section",
  };

  const focusTarget = (target, { reason = "" } = {}) => {
    clear();

    // scrollIntoView walks every scrollable ancestor, so one call handles
    // both the page and the horizontal card rail the cards live in.
    target.element.scrollIntoView({
      behavior: reduceMotion() ? "auto" : "smooth",
      block: target.kind === "section" ? "start" : "center",
      inline: "center",
    });

    highlighted = target.element;
    highlighted.classList.add(HIGHLIGHT_CLASS);
    highlighted.setAttribute("data-agent-focus", target.kind);
    clearTimer = setTimeout(clear, HIGHLIGHT_MS);

    announce(`Highlighting ${KIND_NOUN[target.kind] || "section"}: ${target.label}`);
    document.dispatchEvent(
      new CustomEvent("site-focus", { detail: { id: target.id, kind: target.kind, label: target.label, element: target.element, reason } })
    );
    return target;
  };

  // Highlights are queued rather than fired at once: one answer can name
  // three things, and the visitor (and the sprite) need time to follow
  // each hop before the next one starts.
  let queue = [];
  let queueTimer = 0;

  const runQueue = () => {
    queueTimer = 0;
    const next = queue.shift();
    if (!next) return;
    focusTarget(next.target, next.options);
    if (queue.length) queueTimer = setTimeout(runQueue, QUEUE_GAP_MS);
  };

  const enqueue = (target, options) => {
    if (queue.some((entry) => entry.target === target)) return target;
    queue.push({ target, options });
    if (queue.length > MAX_QUEUE) queue.length = MAX_QUEUE;
    if (!queueTimer) runQueue();
    return target;
  };

  const focus = (query, options = {}) => {
    const target = typeof query === "object" && query ? query : resolve(query);
    if (!target || !target.element) return null;
    return options.queue === false ? focusTarget(target, options) : enqueue(target, options);
  };

  const focusAll = (queries, options = {}) => {
    const resolved = [];
    for (const query of queries) {
      const target = focus(query, options);
      if (target) resolved.push(target);
    }
    return resolved;
  };

  const cancel = () => {
    queue = [];
    if (queueTimer) {
      clearTimeout(queueTimer);
      queueTimer = 0;
    }
    clear();
  };

  const describe = (target) => ({ id: target.id, kind: target.kind, label: target.label });

  const start = () => {
    buildIndex();
    window.BenSiteFocus = {
      focus,
      focusAll,
      resolve,
      mentions,
      cancel,
      list: (kind) => targets.filter((t) => !kind || t.kind === kind).map(describe),
      get: (id) => (byId.has(id) ? describe(byId.get(id)) : null),
    };
    document.dispatchEvent(new CustomEvent("site-focus-ready"));
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
