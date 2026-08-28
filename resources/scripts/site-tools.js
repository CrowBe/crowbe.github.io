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
// Sourced from resources/Benjamin_Crow_Resume.pdf — keep the two in sync.
const ABOUT_BEN = {
  summary: [
    "Ben (Benjamin) Crow is a Full Stack AI Engineer based in Sydney, Australia.",
    "He has 6+ years building production systems across TypeScript, React/Next.js, Ruby on Rails, Python, and event-driven architecture (Kafka, Temporal).",
    "He owns delivery end to end — from ambiguous product requirements through technical design, implementation, release, and iteration — with a focus on test coverage, performance, and maintainability.",
  ],
  experience: [
    "Culture Amp, Sydney (Nov 2024 – present): Software Engineer working with LangChain, Next.js, Ruby on Rails, Python, and Kafka. Ships enterprise AI SaaS features end to end, led performance improvements ahead of a GA release, and helped drive company-wide adoption of AI-assisted development through tutorials and internal tooling.",
    "Mars United Commerce ANZ (Dec 2020 – Nov 2024): progressed from Junior Engineer to Software Engineer / Product Lead. Cut issue resolution time by ~40%, removed security vulnerabilities via major Ruby and Rails upgrades, reduced local dev startup time by ~30%, and migrated legacy UIs from Material-UI to Tailwind with zero production issues.",
    "Career transition (2019 – 2020): moved from outdoor recreation into software via a 6-month Coder Academy intensive (MERN stack, Ruby on Rails), freelanced while based in Japan, and owned the testing strategy for a pre-launch startup app, catching critical security and scalability issues.",
    "Outdoor recreation industry (2011 – 2018): progressed from guide to Program Coordinator, managing logistics, participant safety, and teams across multi-day programs.",
  ],
  skills: [
    "Full-stack product delivery: end-to-end ownership across React/Next.js, Ruby on Rails, and Node.js, from ideation through deployment.",
    "Platform and infrastructure: CI/CD pipeline ownership, AWS production deployment, GCP (including Maps API), monitoring, Kafka and Temporal for event-driven and async processing, and LaunchDarkly feature management.",
    "AI-native engineering: daily agentic workflows and LLM tooling, MCP-connected products, and driving AI-assisted development adoption through tutorials, videos, and internal plugins.",
    "Quality and testing: TDD practitioner who writes and maintains test suites and enforces coverage standards.",
    "Technical leadership: code review, cross-team pairing, internal documentation, and developer education.",
  ],
  projects: [
    "agent.branch (in development): author and validate AI agent skills — chat-driven builder, logic diagrams, mocked test-runs, trigger checks, and portable SKILL.md export.",
    "ClawFace (in development): React Native (Expo) mobile app for supervising AI coding agents, with QR pairing, an Ed25519-authenticated WebSocket protocol, approval workflows, and push notifications.",
    "ScrolLess (open source): agent-powered feed aggregator with an end-to-end-encrypted relay — MCP server plus Fastify backend, Preact PWA client, and Web Push.",
    "crypto-price-pwa (production): live cryptocurrency price progressive web app.",
    "react-hooks-library (released): published NPM package of reusable React hooks.",
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
  // ("I've highlighted ClawFace for you") instead of describing a page the
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

  const TOOLS = [
    {
      name: "get_summary",
      description:
        "Get a short summary of who Ben Crow is and what he does. Also scrolls the visitor's screen to the About section.",
      inputSchema: noArgsSchema,
      execute: async () => answerAndFocus(ABOUT_BEN.summary.join(" "), "section-about"),
    },
    {
      name: "list_experience",
      description:
        "List Ben Crow's work experience and career history, most recent first. Also scrolls the visitor's screen to the About section.",
      inputSchema: noArgsSchema,
      execute: async () => answerAndFocus(ABOUT_BEN.experience.join("\n\n"), "section-about"),
    },
    {
      name: "list_skills",
      description:
        "List Ben Crow's technical skills and areas of expertise. Also scrolls the visitor's screen to the technologies grid. Pass `area` to highlight one group of it.",
      inputSchema: {
        type: "object",
        properties: {
          area: {
            type: "string",
            description: "Optional skill area to highlight on the page, e.g. \"Frontend\", \"Backend\", \"AI & Agentic\", \"Infrastructure\", or a single technology like \"Ruby on Rails\".",
          },
        },
      },
      execute: async ({ area } = {}) => answerAndFocus(ABOUT_BEN.skills.join("\n\n"), "section-about", area ? [area] : []),
    },
    {
      name: "list_projects",
      description:
        "List projects Ben Crow has built or is building, each with the page id of its card. Also scrolls the visitor's screen to the projects rail. Pass `highlight` to bring one card to the front.",
      inputSchema: {
        type: "object",
        properties: {
          highlight: {
            type: "string",
            description: "Optional project name or page id to scroll to and highlight, e.g. \"agent.branch\" or \"project-clawface\".",
          },
        },
      },
      execute: async ({ highlight } = {}) =>
        answerAndFocus(projectLines().join("\n\n"), "section-projects", highlight ? [highlight] : []),
    },
    {
      name: "list_writing",
      description:
        "List the articles Ben Crow has published on this site, each with the page id of its card and a link. Also scrolls the visitor's screen to the writing rail.",
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
          const title = card.querySelector(".card-header h3");
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
        return answerAndFocus(body, "section-writing", highlight ? [highlight] : []);
      },
    },
    {
      name: "list_education",
      description:
        "List Ben Crow's education history. Also scrolls the visitor's screen to the About section.",
      inputSchema: noArgsSchema,
      execute: async () => answerAndFocus(ABOUT_BEN.education.join("\n\n"), "section-about"),
    },
    {
      name: "get_contact_info",
      description:
        "Get how to get in touch with Ben Crow. Also scrolls the visitor's screen to the Contact section.",
      inputSchema: noArgsSchema,
      execute: async () => answerAndFocus(ABOUT_BEN.contact, "section-contact"),
    },
    {
      name: "list_page_targets",
      description:
        "List everything on this page that show_on_page can scroll to and highlight — sections, project cards, article cards, skill groups and individual technologies — with the page id of each.",
      inputSchema: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: ["section", "project", "writing", "skill-group", "tech"],
            description: "Optional filter; omit to list every target.",
          },
        },
      },
      execute: async ({ kind } = {}) => {
        const focus = focusApi();
        if (!focus) return textResult("This page has no highlightable targets.");
        const lines = focus.list(kind).map((target) => `${target.id} — ${target.label} (${target.kind})`);
        return textResult(lines.length ? lines.join("\n") : `No targets of kind "${kind}".`);
      },
    },
    {
      name: "show_on_page",
      description:
        "Point the visitor at something on this page: scroll it into view, highlight it, and send the guide sprite to it. Use this whenever you mention a specific project, article, or technology, so the person reading sees what you are talking about. Accepts a page id from list_page_targets or a plain name like \"ScrolLess\".",
      inputSchema: {
        type: "object",
        properties: {
          target: {
            type: "string",
            description: "Page id or name to show, e.g. \"project-scrolless\", \"ScrolLess\", or \"Ruby on Rails\".",
          },
        },
        required: ["target"],
      },
      execute: async ({ target } = {}) => {
        const focus = focusApi();
        if (!focus) return textResult("This page cannot be navigated right now.");
        const shown = focus.focus(target);
        if (!shown) {
          return textResult(
            `Nothing on this page matches "${target}". Call list_page_targets to see what can be shown.`
          );
        }
        const described = focus.get(shown.id) || shown;
        return textResult(`Showing ${described.label} (${described.kind}) — it is now scrolled into view and highlighted.`);
      },
    },
  ];

  // No browser ships document.modelContext natively yet (Chrome, behind a flag,
  // is first). Only install a fallback when nothing — native or a polyfill
  // loaded earlier on the page — has already defined it.
  if (!("modelContext" in document)) {
    const registry = new Map();
    document.modelContext = {
      registerTool(tool, options) {
        registry.set(tool.name, tool);
        options?.signal?.addEventListener("abort", () => registry.delete(tool.name));
      },
      getTools: () => Array.from(registry.values()),
    };
  }

  for (const tool of TOOLS) {
    try {
      document.modelContext.registerTool(tool);
    } catch (error) {
      console.warn(`Site tools: failed to register "${tool.name}"`, error);
    }
  }

  window.BenSiteTools = { ABOUT_BEN, TOOLS };
})();
