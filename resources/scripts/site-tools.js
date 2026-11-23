// Shared facts + tools about Ben, consumed by:
//   - ask-ben.js, the in-page chat widget (reads ABOUT_BEN for its system prompt)
//   - WebMCP (document.modelContext.registerTool), so external AI agents/browsers
//     can query the site directly instead of scraping the DOM.
// See https://webmachinelearning.github.io/webmcp/ for the WebMCP spec.
//
// The tools are two-way: as well as answering, each one moves the page.
// Asking about projects scrolls the visitor to the projects rail; naming a
// single project highlights that card and sends the guide sprite to it. So
// an agent driving this site drives what its human sees, not just what it
// reads. The page work lives in site-focus.js; this file only calls it.
//
// Edit ABOUT_BEN to control the only facts either consumer is allowed to use.
// Career facts come from the resume; project facts also reflect the linked repos.
const ABOUT_BEN = {
  summary: [
    "Ben (Benjamin) Crow is a Senior Software Engineer (AI) at Culture Amp, based in Sydney, Australia. He works directly on Coach, the agentic AI system in Culture Amp's platform.",
    "He has 6+ years building production systems across TypeScript, React/Next.js, Ruby on Rails, Python, and event-driven architecture (Kafka, Temporal).",
    "He owns delivery end to end — from ambiguous product requirements through technical design, implementation, release, and iteration — with a focus on test coverage, performance, and maintainability.",
  ],
  experience: [
    "Culture Amp, Sydney (Sep 2026 – present): Senior Software Engineer (AI), working directly on Coach, the agentic AI system in Culture Amp's platform. Also building an agent harness for his team that encodes their ways of working with AI: skills, scripts and deterministic checks for planning, sharing plans, dispatching and reviewing work, plus trace capture for improving the harness. Used by his team so far, with good feedback.",
    "Culture Amp, Sydney (Nov 2024 – Sep 2026): Software Engineer working with LangChain, Next.js, Ruby on Rails, Python, and Kafka. On Coach, he prototyped, wrote the RFC for and built most of the human-in-the-loop pattern that lets the agent write content (reviews, feedback, conversation topics) with guaranteed, audited human approval; four product domains have adopted it so far. Shipped enterprise AI SaaS features end to end, led performance improvements ahead of a GA release, and helped drive company-wide adoption of AI-assisted development through tutorials and internal tooling.",
    "Mars United Commerce ANZ (Dec 2020 – Nov 2024): progressed from Junior Engineer to Software Engineer / Product Lead. Cut issue resolution time by ~40%, removed security vulnerabilities via major Ruby and Rails upgrades, reduced local dev startup time by ~30%, and migrated legacy UIs from Material-UI to Tailwind with zero production issues.",
    "Career transition (2019 – 2020): moved from outdoor recreation into software via a 6-month Coder Academy intensive (MERN stack, Ruby on Rails), freelanced while based in Japan, and owned the testing strategy for a pre-launch startup app, catching critical security and scalability issues.",
    "Outdoor recreation industry (2011 – 2018): progressed from guide to Program Coordinator, managing logistics, participant safety, and teams across multi-day programs.",
  ],
  skills: [
    "Full-stack product delivery: end-to-end ownership across React/Next.js, Ruby on Rails, and Node.js, from ideation through deployment.",
    "Platform and infrastructure: CI/CD pipeline ownership, AWS production deployment, GCP (including Maps API), monitoring, Kafka and Temporal for event-driven and async processing, and LaunchDarkly feature management.",
    "AI-native engineering: daily agentic workflows and LLM tooling, prompt engineering, observability, MCP-connected products, and driving AI-assisted development adoption through tutorials, videos, and internal plugins. Has also worked on LLM evals and fine-tuning in personal projects (not at Culture Amp).",
    "Quality and testing: TDD practitioner who writes and maintains test suites and enforces coverage standards.",
    "Technical leadership: code review, cross-team pairing, internal documentation, and developer education.",
  ],
  projects: [
    "Reno Layouts (deployed): browser-based renovation floor-plan studio (TypeScript, React, three.js) where an agent edits the live 2D/3D model through WebMCP tools.",
    "Weave (active development): goal-directed agent runtime that weighs available actions over explicit state, applies policy and authority boundaries, and requests inference as a tool when needed.",
    "ScrolLess (active development): agent-powered feed aggregator with an end-to-end-encrypted relay — MCP server plus Fastify backend, Preact PWA client, and Web Push.",
    "This site's agent (deployed): on-device browser model that answers questions about Ben's work through explicit site functions, also exposed as WebMCP tools.",
  ],
  education: [
    "Coder Academy: Diploma of Information Technology (MERN stack, Ruby on Rails), 2019.",
    "Avondale College: Diploma of Outdoor Recreation, 2010 – 2011.",
  ],
  contact:
    "Use the contact section of this site, or the resume PDF linked on the page, to get in touch with Ben.",
};

(() => {
  "use strict";

  const noArgsSchema = { type: "object", properties: {} };
  const textResult = (text) => ({ content: [{ type: "text", text }] });

  const focusApi = () => window.BenSiteFocus || null;

  // Every answer is followed by a note about what the page just did, so a
  // remote agent knows the visitor's screen moved and can talk about it
  // ("I've highlighted ScrolLess for you") instead of describing a page the
  // human isn't looking at.
  const focusNote = (targets) => {
    if (!targets || !targets.length) return "";
    const labels = targets.map((target) => target.label);
    return `\n\n(On screen: scrolled to ${labels.join(" → ")}.)`;
  };

  // Answer, then move the page. `sectionId` is the coarse landing spot; a
  // resolvable `mentioned` name replaces it rather than queueing behind it,
  // since scrolling a card into view brings its section along anyway.
  const answerAndFocus = (body, sectionId, mentioned = []) => {
    const focus = focusApi();
    if (!focus) return textResult(body);
    const specific = mentioned.filter((name) => focus.resolve(name));
    const shown = focus
      .focusAll(specific.length ? specific : [sectionId])
      .map((target) => focus.get(target.id) || target);
    return textResult(body + focusNote(shown));
  };

  // Pair each resume project line with the card that represents it, so the
  // agent gets ids it can pass straight back into show_on_page.
  const projectLines = () =>
    ABOUT_BEN.projects.map((line) => {
      const name = line.split(/\s*[(:]/)[0].trim();
      const target = focusApi()?.resolve(name);
      return target ? `${line}\n  page id: ${target.id}` : line;
    });

  const VALID_KINDS = ["section", "project", "writing", "skill-group", "tech"];

  const TOOLS = [
    {
      name: "get_summary",
      description:
        "Get a short summary of who Ben Crow is and what he does, and scroll the visitor's screen to the About section.",
      inputSchema: noArgsSchema,
      execute: async () => answerAndFocus(ABOUT_BEN.summary.join(" "), "section-about"),
      annotations: { readOnlyHint: true },
    },
    {
      name: "list_experience",
      description:
        "List Ben Crow's work experience and career history, most recent first, and scroll the visitor's screen to the About section.",
      inputSchema: noArgsSchema,
      execute: async () => answerAndFocus(ABOUT_BEN.experience.join("\n\n"), "section-about"),
      annotations: { readOnlyHint: true },
    },
    {
      name: "list_skills",
      description:
        "List Ben Crow's technical skills and areas of expertise, and scroll the visitor's screen to the technologies grid.",
      inputSchema: {
        type: "object",
        properties: {
          area: {
            type: "string",
            description: "Optional skill group or technology name to highlight on the page (e.g. \"Frontend\", \"AI & Agentic\", or \"Ruby on Rails\").",
          },
        },
      },
      execute: async ({ area } = {}) => {
        const query = typeof area === "string" ? area.trim() : "";
        return answerAndFocus(ABOUT_BEN.skills.join("\n\n"), "section-about", query ? [query] : []);
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: "list_projects",
      description:
        "List projects Ben Crow has built or is building, each with its page id, and scroll the visitor's screen to the projects section.",
      inputSchema: {
        type: "object",
        properties: {
          highlight: {
            type: "string",
            description: "Optional project name or page id to scroll to and highlight (e.g. \"Weave\" or \"project-reno-layouts\").",
          },
        },
      },
      execute: async ({ highlight } = {}) => {
        const query = typeof highlight === "string" ? highlight.trim() : "";
        return answerAndFocus(projectLines().join("\n\n"), "section-projects", query ? [query] : []);
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: "list_writing",
      description:
        "List the articles Ben Crow has published on this site, each with its page id and link, and scroll the visitor's screen to the writing section.",
      inputSchema: {
        type: "object",
        properties: {
          highlight: {
            type: "string",
            description: "Optional article title or page id to scroll to and highlight.",
          },
        },
      },
      execute: async ({ highlight } = {}) => {
        const cards = Array.from(document.querySelectorAll(".writing-card"), (card) => {
          const link = card.querySelector(".writing-card-link");
          const title = card.querySelector(".card-header :is(h3, h4)");
          const excerpt = card.querySelector(".writing-card-excerpt");
          const series = card.querySelector(".writing-card-series");
          const id = focusApi()?.resolve(title ? title.textContent : "")?.id;
          return [
            title ? title.textContent.trim() : "",
            series ? `  ${series.textContent.trim()}` : "",
            excerpt ? `  ${excerpt.textContent.trim()}` : "",
            link ? `  ${new URL(link.getAttribute("href"), location.href).href}` : "",
            id ? `  page id: ${id}` : "",
          ]
            .filter(Boolean)
            .join("\n");
        });
        const body = cards.length ? cards.join("\n\n") : "No articles are listed on this page.";
        const query = typeof highlight === "string" ? highlight.trim() : "";
        return answerAndFocus(body, "section-writing", query ? [query] : []);
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: "list_education",
      description:
        "List Ben Crow's education history and scroll the visitor's screen to the About section.",
      inputSchema: noArgsSchema,
      execute: async () => answerAndFocus(ABOUT_BEN.education.join("\n\n"), "section-about"),
      annotations: { readOnlyHint: true },
    },
    {
      name: "get_contact_info",
      description:
        "Get how to get in touch with Ben Crow and scroll the visitor's screen to the Contact section.",
      inputSchema: noArgsSchema,
      execute: async () => answerAndFocus(ABOUT_BEN.contact, "section-contact"),
      annotations: { readOnlyHint: true },
    },
    {
      name: "list_page_targets",
      description:
        "List every element on this page that can be scrolled to and highlighted, along with its page id.",
      inputSchema: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: VALID_KINDS,
            description: "Optional category to narrow the returned targets.",
          },
        },
      },
      execute: async ({ kind } = {}) => {
        if (kind !== undefined && !VALID_KINDS.includes(kind)) {
          return { error: `Unsupported kind "${kind}".`, validKinds: VALID_KINDS };
        }
        const focus = focusApi();
        if (!focus) return { error: "This page has no highlightable targets." };
        const lines = focus.list(kind).map((target) => `${target.id} — ${target.label} (${target.kind})`);
        return textResult(lines.length ? lines.join("\n") : `No targets of kind "${kind}".`);
      },
      annotations: { readOnlyHint: true },
    },
    {
      name: "show_on_page",
      description:
        "Scroll a specific project, article, section, or technology into view, highlight it, and guide the visitor's eye to it. Use whenever referring to a specific item on the page.",
      inputSchema: {
        type: "object",
        properties: {
          target: {
            type: "string",
            description: "Page id from list_page_targets or a plain name (e.g. \"project-scrolless\", \"ScrolLess\", or \"Ruby on Rails\").",
          },
        },
        required: ["target"],
      },
      execute: async ({ target } = {}) => {
        if (typeof target !== "string" || !target.trim()) {
          return { error: "Provide a non-empty target page id or name." };
        }
        const focus = focusApi();
        if (!focus) return { error: "This page cannot be navigated right now." };
        const shown = focus.focus(target);
        if (!shown) {
          return {
            error: `Nothing on this page matches "${target}".`,
            hint: "Call list_page_targets to see valid page ids.",
          };
        }
        const described = focus.get(shown.id) || shown;
        return textResult(`Showing ${described.label} (${described.kind}) — it is now scrolled into view and highlighted.`);
      },
      annotations: { readOnlyHint: true },
    },
  ];

  // Register tools only when WebMCP is natively available (or polyfilled
  // before this script runs), using AbortSignal for clean teardown.
  if ("modelContext" in document && typeof document.modelContext?.registerTool === "function") {
    const controller = new AbortController();
    for (const tool of TOOLS) {
      try {
        document.modelContext.registerTool(tool, { signal: controller.signal });
      } catch (error) {
        console.warn(`Site tools: failed to register "${tool.name}"`, error);
      }
    }
    window.addEventListener("pagehide", (event) => {
      if (!event.persisted) controller.abort();
    });
  }

  window.BenSiteTools = { ABOUT_BEN, TOOLS };
})();
