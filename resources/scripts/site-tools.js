// Shared facts + tools about Ben, consumed by:
//   - ask-ben.js, the in-page chat widget (reads ABOUT_BEN for its system prompt)
//   - WebMCP (document.modelContext.registerTool), so external AI agents/browsers
//     can query the site directly instead of scraping the DOM.
// See https://webmachinelearning.github.io/webmcp/ for the WebMCP spec.
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

  const TOOLS = [
    {
      name: "get_summary",
      description: "Get a short summary of who Ben Crow is and what he does.",
      inputSchema: noArgsSchema,
      execute: async () => textResult(ABOUT_BEN.summary.join(" ")),
    },
    {
      name: "list_experience",
      description: "List Ben Crow's work experience and career history, most recent first.",
      inputSchema: noArgsSchema,
      execute: async () => textResult(ABOUT_BEN.experience.join("\n\n")),
    },
    {
      name: "list_skills",
      description: "List Ben Crow's technical skills and areas of expertise.",
      inputSchema: noArgsSchema,
      execute: async () => textResult(ABOUT_BEN.skills.join("\n\n")),
    },
    {
      name: "list_projects",
      description: "List projects Ben Crow has built or is building.",
      inputSchema: noArgsSchema,
      execute: async () => textResult(ABOUT_BEN.projects.join("\n\n")),
    },
    {
      name: "list_education",
      description: "List Ben Crow's education history.",
      inputSchema: noArgsSchema,
      execute: async () => textResult(ABOUT_BEN.education.join("\n\n")),
    },
    {
      name: "get_contact_info",
      description: "Get how to get in touch with Ben Crow.",
      inputSchema: noArgsSchema,
      execute: async () => textResult(ABOUT_BEN.contact),
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
