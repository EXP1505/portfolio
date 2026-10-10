// All page copy lives here so sections stay purely presentational.
// The Vyomin case-study prose lives in ./vyomin.mdx.

export type Figure = {
  /** Path under /public, e.g. "/images/vyomin/event-study.png". null renders a labelled placeholder frame. */
  src: string | null;
  alt: string;
  width: number;
  height: number;
  caption?: string;
};

export type Link = { label: string; href: string };

/** Screenshot under /public/images with its real pixel size (keeps the frame's aspect ratio exact). */
const shot = (src: string, width: number, height: number, caption: string, alt: string): Figure => ({
  src: `/images/${src}`,
  alt,
  width,
  height,
  caption,
});

export const site = {
  name: "Anubhav Pandey",
  role: "Backend Engineer",
  pitch: "I build backend systems that test real-world hypotheses, not just move data around.",
  url: "https://anubhavpandey.dev",
  email: "anubhavpandey1505@gmail.com",
  callsign: "AP-01",
  location: "Bengaluru",

  nav: [
    { label: "About", href: "#about" },
    { label: "Systems", href: "#systems" },
    { label: "Projects", href: "#projects" },
    { label: "CP", href: "#cp" },
    { label: "Contact", href: "#contact" },
  ] satisfies Link[],

  links: [
    { label: "GitHub", href: "https://github.com/EXP1505" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/anubhav-pandey-125b6b330/" },
    { label: "Résumé", href: "/resume.pdf" },
  ] satisfies Link[],

  about: [
    "I'm a Computer Science student at Dayananda Sagar College of Engineering, graduating in 2028. I build backend-heavy systems — the kind with concurrent pipelines, more than one database, and logic that has to actually be correct, not just run.",
    "Most of my time goes to Vyomin, a platform that tests whether geopolitical conflict events move stock prices. Building it meant writing a multi-threaded ingestion pipeline for millions of records, splitting storage across PostgreSQL and Neo4j, and writing a statistical engine rigorous enough that I caught two of my own significance bugs before they shipped. Alongside that I solve competitive-programming problems (500+ across LeetCode, Codeforces and CodeChef) and argue country positions under pressure at Model UN.",
    "I'm looking for a software engineering internship for Summer 2027 — ideally somewhere I can work on real backend systems and data problems. I'd rather be judged on what I've built and can defend than on my graduation year.",
  ],

  details: [
    { label: "Based in", value: "Bengaluru" },
    { label: "Studying", value: "B.E. Computer Science & Engineering, Dayananda Sagar College of Engineering" },
    { label: "Graduating", value: "Aug 2028" },
    { label: "CGPA", value: "8.6 / 10" },
  ],

  systems: [
    { group: "Languages", items: ["Java", "JavaScript", "TypeScript"] },
    { group: "Backend & Web", items: ["Spring Boot", "Node.js", "Express", "REST APIs", "WebSocket", "EJS"] },
    { group: "Databases", items: ["PostgreSQL", "MongoDB", "Neo4j", "Redis", "SQL"] },
    { group: "Tools", items: ["Git"] },
  ],
  // Listed on the résumé but not yet backed by a project on this site, so shown lighter.
  alsoFamiliar: ["Python", "Tableau", "N8N"],

  vyomin: {
    name: "Vyomin",
    period: "July 2026 – Present",
    tagline: "An OSINT platform that tests whether geopolitical conflict events actually move stock prices.",
    summary:
      "A plain dashboard can show you conflict events and market prices side by side, but it can't tell you whether one actually affects the other. Vyomin fuses a live geopolitical-event feed (GDELT) with market data and runs a real statistical event study over it — bootstrap significance testing with multiple-comparison correction, not a chart overlay that just looks convincing.",
    stats: [
      { value: "4.35M", label: "GDELT records ingested" },
      { value: "79 min", label: "Ingestion, down from a 14–17 hour sequential backfill" },
      { value: "10,000", label: "Bootstrap iterations per significance test" },
      { value: "2", label: "Statistical bugs caught and fixed before shipping" },
    ],
    stack: ["Java", "Spring Boot", "PostgreSQL", "Neo4j", "Redis", "React", "WebSocket/STOMP", "JWT + OAuth"],
    links: [
      { label: "Live", href: "https://vyomin-web.onrender.com/" },
      { label: "Source", href: "https://github.com/EXP1505/Vyomin" },
    ] satisfies Link[],
    cover: shot(
      "vyomin/home.png", 1917, 871,
      "Home — globe and live signal feed",
      "Vyomin home view: a 3D globe of conflict signals beside a live feed of market and conflict events",
    ),
    eventStudy: shot(
      "vyomin/event-study-results.png", 1917, 861,
      "Event Study results — 28 combinations tested, Bonferroni-corrected threshold 0.00179",
      "Vyomin Event Study results: 28 combinations tested, 23 testable, corrected threshold 0.00179. Fight RUS–UKR at p = 0.0002 survives correction; Fight ISR–PSE and Assault ISR–PSE do not.",
    ),
    architecture: shot(
      "vyomin/architecture.png", 1068, 667,
      "System architecture",
      "Vyomin architecture: GDELT geopolitical events and Yahoo Finance (previously Stooq) feed an ingestion pipeline (4.35M records, worker pool, 79 min), which writes to PostgreSQL for analytics and time-series data and to Neo4j for the relationship graph. PostgreSQL feeds the event-study engine; Neo4j feeds the React 3D globe and graph.",
    ),
    gallery: [
      shot(
        "vyomin/analyzer.png", 1917, 857,
        "Event-Study Analyzer — event type, date range and stock basket",
        "Vyomin Event-Study Analyzer form: event type Fight, a date range, and a basket of LMT, RTX, NOC, GD and BA, with windows fixed at +1, +3 and +5 trading days",
      ),
      shot(
        "vyomin/batch-sweep.png", 1917, 858,
        "Batch Sweep — 2 event types × 14 country pairs = 28 combinations",
        "Vyomin Batch Sweep configuration with Assault and Fight selected, previewing 28 combinations",
      ),
      shot(
        "vyomin/intelligence-graph.png", 1917, 866,
        "Intelligence Graph — India",
        "Vyomin force-directed intelligence graph for India, with an India–USA diplomatic cooperation event selected and its GDELT properties shown",
      ),
      shot(
        "vyomin/financial-telemetry.png", 1917, 862,
        "Financial Telemetry — big-cap movers, conflict signals and market news",
        "Vyomin Financial Telemetry view with top and struggling big caps, related conflict signals and market news",
      ),
      shot(
        "vyomin/googl-candlestick.png", 1916, 860,
        "Ticker detail — GOOGL, last 30 trading days",
        "Vyomin ticker detail modal showing a 30-day GOOGL candlestick chart",
      ),
      shot(
        "vyomin/landing.png", 1917, 868,
        "Landing — sign in with email or Google",
        "Vyomin landing page describing the Command Globe, Intelligence Graph, Financial Telemetry and Event Study Analyzer, with a login panel",
      ),
    ],
  },

  fincraft: {
    name: "Fincraft",
    period: "Jun 2025 – Nov 2025",
    tagline: "A real-time stock sentiment and progress tracker, pulling live market data from the Finnhub API.",
    summary:
      "A full-stack app built on Node/Express with MongoDB, server-rendered with EJS in a REST/MVC structure. Users authenticate with bcrypt-hashed passwords; live market data comes from Finnhub, with express-rate-limit throttling to stay under its 60-requests-per-minute cap and protect the API key during heavy fetches. It's the earlier, simpler project that taught me the fundamentals I later did properly in Vyomin.",
    stack: ["Node.js", "Express", "MongoDB", "EJS", "JavaScript", "Tailwind CSS"],
    links: [
      { label: "Live", href: "https://fincraft.onrender.com/" },
      { label: "Source", href: "https://github.com/EXP1505/Fincraft" },
    ] satisfies Link[],
    cover: shot(
      "fincraft/home.png", 1917, 867,
      "Dashboard — popular stocks, market news and recent trades",
      "Fincraft dashboard with a popular-stocks ticker, latest market news and a recent trades table",
    ),
    thumbs: [
      shot("fincraft/stock.png", 1917, 861, "Stock detail", "Fincraft stock detail page for LMT with quote stats and an intraday price chart"),
      shot("fincraft/trade-order.png", 1917, 871, "Buy / sell", "Fincraft buy or sell order screen"),
    ],
  },

  cp: {
    total: "500+",
    profiles: [
      {
        platform: "LeetCode",
        handle: "_anubhavpandey_",
        href: "https://leetcode.com/u/_anubhavpandey_/",
        rating: "1680",
        peak: "1699",
        title: null,
        solved: "150+",
      },
      {
        platform: "Codeforces",
        handle: "exp_1505",
        href: "https://codeforces.com/profile/exp_1505",
        rating: "1303",
        peak: "1313",
        title: "Pupil",
        solved: "100+",
      },
      // Deliberately no handle or link.
      { platform: "CodeChef", handle: null, href: null, rating: "1580", peak: "1624", title: null, solved: "250+" },
    ] as {
      platform: string;
      handle: string | null;
      href: string | null;
      rating: string;
      peak: string;
      title: string | null;
      solved: string;
    }[],
  },

  contact: {
    line: "Looking for a Summer 2027 software engineering internship — backend and data systems especially.",
  },

  footer: {
    year: 2026,
    // Fill in once the jet model is chosen, if its license requires attribution.
    modelCredit: null as string | null,
  },
};
