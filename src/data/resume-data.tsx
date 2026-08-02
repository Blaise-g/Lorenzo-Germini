import { GitHubIcon, LinkedInIcon, XIcon } from "@/components/icons";
import { CANONICAL_ORIGIN } from "@/lib/site-hosts";
import { ResumeData } from "./resume-data.types";

export const RESUME_DATA: ResumeData = {
  name: "Lorenzo Germini",
  initials: "LG",
  location: "Turin, Italy, CET",
  roleLabel: "AI Product Engineer",
  newsletter: {
    name: "germinai",
    url: "https://lorenzogermini.substack.com",
  },
  about:
    "AI Product Engineer shipping production systems end-to-end across compliance, health, and education",
  summary:
    "I'm an AI product engineer: I take LLM systems from idea to production and stay responsible for the whole path — the infrastructure, the product decisions, and whether the thing actually helps anyone.\n\nRight now that means building the AI engine behind Complaion, a compliance platform for European SMEs getting and keeping ISO certifications: multi-provider LLM infrastructure, agentic RAG, and the evals that keep both honest. Before that: AI for pharma manufacturing at GSK, AI R&D in digital health, and a GenAI EdTech startup I built as founding engineer. The through-line: technical depth only matters when it connects to a real user problem.\n\nOutside work: sports, GenAI side projects, and rabbit holes on tech entrepreneurship and biohacking.",
  writingPage: {
    standfirst:
      "Essays on frontier AI, the companies being built on it, and what it does to the economics of software. Published on germinai.",
    cadence: "new ones roughly fortnightly",
    awaitingFirst:
      "The first essay is not published yet. Subscribe below and it arrives the day it does.",
    leadCta: "Read the essay →",
    archiveLabel: "Read all essays on Substack →",
  },
  homepage: {
    hero: {
      headline: {
        lead: "I build AI products end-to-end — and write about ",
        emphasis: "what actually works",
        trail: ".",
      },
      subhead:
        "Right now that's the agentic RAG engine and multi-provider LLM infrastructure (OpenAI, Claude, Gemini) behind Complaion, a compliance platform for ISO certifications. Before that: pharma manufacturing, digital health, and a GenAI startup.",
      cta: "Start with the writing ↓",
    },
    writing: {
      standingLine:
        "Field notes from building with AI, published on germinai. No definitive guides — things I tried, what broke, and what earned its place.",
      featured: {
        title: "Drop the Bloat",
        excerpt:
          "My Claude Code sessions started at ~35K tokens of context before I typed anything. A field note on cutting that to 13K — and on knowing when context stops earning its place.",
        /* The publication, not the post: the feed and archive are both empty at
           the time of writing, so a /p/<slug> link would be a dead one. Swap in
           the post URL and add `date` / `readingMinutes` the day it publishes —
           the teaser renders its meta line only once they exist. */
        href: "https://lorenzogermini.substack.com",
      },
    },
    earlierRoles:
      "Burgeon Labs — fine-tuned LMs for abstractive summarisation of biomedical literature, deployed end-to-end. Roche — a gradient-boosted-tree model for fill-parameter tuning on a personalised-medicine prototype, 20% faster than manual. EPFL MSc, Life Sciences Engineering.",
    systems:
      "Python · TypeScript · Next.js · Postgres / pgvector · pgai · AWS · OpenAI / Anthropic / Gemini · agentic RAG · evals & tracing · time-series ML",
  },
  avatarUrl: "https://avatars.githubusercontent.com/u/48798069?v=4",
  personalWebsiteUrl: CANONICAL_ORIGIN,
  contact: {
    email: "lorenzo.germini@icloud.com",
    tel: "+393279220232",
    social: [
      {
        name: "GitHub",
        url: "https://github.com/Blaise-g",
        icon: GitHubIcon,
      },
      {
        name: "LinkedIn",
        url: "https://www.linkedin.com/in/lorenzogermini/",
        icon: LinkedInIcon,
      },
      {
        name: "X",
        url: "https://twitter.com/spleenboi_",
        icon: XIcon,
      },
    ],
  },
  education: [
    {
      school: "Swiss Federal Institute of Technology Lausanne (EPFL)",
      degree:
        "MSc in Life Sciences Engineering (specialization in Neuroscience & Neuroengineering)",
      start: "2020",
      end: "2022",
    },
    {
      school: "Polytechnic of Turin",
      degree: "Bachelor's Degree in Electrical Engineering",
      start: "2017",
      end: "2020",
    },
  ],
  work: [
    {
      company: "Complaion",
      link: "https://www.complaion.com/",
      badges: ["Turin, Italy"],
      title: "AI Engineer",
      start: "May 2025",
      end: "Present",
      description: [
        "Building the AI engine behind Complaion, a compliance automation platform helping European SMEs get and keep ISO certifications.",
        "Multi-provider LLM infrastructure (OpenAI, Claude, Gemini), agentic RAG over ISO documentation, and evaluation frameworks that keep both honest in production.",
        "Ship end-to-end AI product features and automation workflows for cross-functional teams.",
      ],
      homepageProof:
        "Multi-provider LLM infrastructure (OpenAI, Anthropic, Gemini), agentic RAG over ISO documentation, and the evaluation harness that keeps both honest in production.",
    },
    {
      company: "Stealth GenAI Startup",
      link: "",
      badges: ["Turin, Italy"],
      title: "Founding AI Engineer",
      start: "Nov 2024",
      end: "Apr 2025",
      description: [
        "Built the backend and GenAI API layer from zero on AWS (DynamoDB, Amplify, Lambda) for an EdTech product.",
        "RAG stack on pgai with custom parsing pipelines for machine-readable and handwritten content, plus tracing and evaluation workflows to tune prompts and retrieval quality.",
        "Led engineering for the MVP end-to-end, working directly with the product manager.",
      ],
      homepageProof:
        "Backend and GenAI API layer from zero on AWS (Lambda, DynamoDB, Amplify); a pgai RAG stack with custom parsing for handwritten input, plus tracing and evals to tune retrieval.",
    },
    {
      company: "GSK",
      link: "https://www.gsk.com/en-gb/home/",
      badges: ["Saint-Amand-les-Eaux, France"],
      title: "AI Engineer",
      start: "Sep 2023",
      end: "Oct 2024",
      description: [
        "Used Python and multi-source sensor data to find inefficiencies across pharmaceutical utilities; designed water rejection strategies projected to save 10,000 m³ annually.",
        "Anomaly detection and time-series forecasting for manufacturing operations, plus semantic NLP for fault detection and maintenance decisions.",
        "Natural-language interfaces and generative AI use cases that made plant data usable on the floor.",
      ],
      homepageProof:
        "Time-series forecasting and anomaly detection on plant sensor data, semantic NLP for fault detection, and a water-rejection strategy projected at 10,000 m³/year.",
    },
    {
      company: "Self Employed",
      link: "https://liceocuneo.it/",
      badges: ["Cuneo, Italy"],
      title: "Teacher and Digital Freelancer",
      start: "Nov 2022",
      end: "Aug 2023",
      description: [
        "Taught math and physics at my old high school; built an interior-design MVP with Stable Diffusion and Dreambooth fine-tuning on a hand-curated dataset of room designs I preprocessed myself, then killed it on the evidence after customer discovery.",
      ],
      homepageProof:
        "A Stable Diffusion interior-design MVP with Dreambooth fine-tuning on a hand-curated dataset — then killed on the evidence after customer discovery.",
    },
    {
      company: "Burgeon Labs",
      link: "https://www.burgeonlabs.com/",
      badges: ["Geneva, Switzerland"],
      title: "Engineering Intern",
      start: "Feb 2022",
      end: "Oct 2022",
      description: [
        "Fine-tuned language models for abstractive summarization of biomedical literature, deployed as an end-to-end pipeline for the company's first digital health product.",
      ],
    },
    {
      company: "Roche",
      link: "https://www.roche.com/",
      badges: ["Basel, Switzerland"],
      title: "Summer Intern - 'Think Tank in Innovation & Sustainability'",
      start: "Jul 2021",
      end: "Oct 2021",
      description: [
        "Took a personalized-medicine filling prototype through hardware-software integration testing, and built a gradient-boosted tree ML model for fill parameter tuning — 20% faster than manual.",
      ],
    },
  ],
  skills: ["Generative AI", "LLMs", "RAG", "Full-Stack Development", "Python"],
  skillGroups: [
    {
      name: "AI systems",
      skills: ["Generative AI", "LLMs", "RAG"],
    },
    {
      name: "Product engineering",
      skills: ["Full-Stack Development", "TypeScript", "Python"],
    },
    {
      name: "Data systems",
      skills: ["Postgres", "pgvector"],
    },
  ],
  projects: [
    {
      title: "L'Oracolo della Ghigliottina",
      techStack: [
        "Side Project",
        "Generative AI",
        "Next.js",
        "Vercel AI SDK",
        "Telegram Bot",
        "WhatsApp Bot",
      ],
      description:
        "AI game companion for La Ghigliottina, the cult final round of Italy's most-watched quiz show. Send the five clue words — typed or snapped from the TV — and it finds the one that connects them. 100% accuracy so far, with rate-limit handling because Italians take this game seriously.",
      link: {
        label: "L'Oracolo della Ghigliottina",
        href: "https://ghigliottina.vercel.app/",
      },
    },
    {
      title: "Biomedical Paper Summarizer",
      techStack: [
        "MSc Thesis Project",
        "Generative AI",
        "PyTorch",
        "Python",
        "Gradio",
      ],
      description:
        "MSc thesis work: an end-to-end pipeline that turns full-text biomedical papers into either a detailed analysis or a TL;DR, tuned on longevity and human-health literature.",
      link: {
        label: "Biomedical Paper Summarizer",
        href: "https://huggingface.co/spaces/Blaise-g/summarize-biomedical-papers-long-summary-or-tldr",
      },
    },
  ],
} as const;
