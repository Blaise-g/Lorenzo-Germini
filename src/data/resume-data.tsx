import { GitHubIcon, LinkedInIcon, XIcon } from "@/components/icons";
import { CANONICAL_ORIGIN } from "@/lib/site-hosts";
import { ResumeData } from "./resume-data.types";

export const RESUME_DATA: ResumeData = {
  name: "Lorenzo Germini",
  initials: "LG",
  location: "Cuneo, Italy, CET",
  roleLabel: "AI Product Engineer",
  newsletter: {
    name: "germinai",
    url: "https://lorenzogermini.substack.com",
  },
  about:
    "AI Product Engineer shipping AI products end-to-end across compliance, health, and education",
  summary:
    "I'm an AI product engineer: I ship AI products end-to-end, from the models and infrastructure to the interface people actually touch, and stay on the hook for whether the thing helps anyone. Full stack in the literal sense: backend, frontend, and the product calls in between.\n\nThese days that's the AI engine behind Complaion, a compliance platform for European SMEs getting and keeping ISO certifications. The interesting problem is making the agents in the background reliable enough to trust with real compliance work, and knowing when they're not. Before that: AI for pharma manufacturing at GSK, AI R&D in digital health, and a GenAI EdTech startup I built as founding engineer. The through-line hasn't changed: technical depth only matters when it meets a real user problem.\n\nOutside work: sports, side projects, and rabbit holes on tech entrepreneurship and biohacking.",
  metaTitle: "Lorenzo Germini | AI Product Engineer",
  metaDescription:
    "AI product engineer. I build the AI engine behind Complaion, a compliance platform for European SMEs, and write about building with AI at germinai.",
  writingPage: {
    standfirst:
      "Field notes, mostly from building with AI and the people building on it. No definitive guides. The advice changes every two days anyway. Published on germinai.",
    cadence: "new ones when there's something worth the send",
    leadCta: "Read the field note →",
    archiveLabel: "Read all posts on Substack →",
  },
  homepage: {
    hero: {
      headline: {
        lead: "I build AI products end-to-end and write about ",
        emphasis: "what actually works",
        trail: ".",
      },
      subhead:
        "Right now that's the AI engine behind Complaion, a compliance platform for ISO certifications: LLM agents doing real compliance work in the background, and the evals that show when they can't be trusted. Before that: pharma manufacturing, digital health, and a GenAI startup.",
      cta: "Start with the writing ↓",
    },
    writing: {
      standingLine:
        "Field notes, mostly from building with AI, published on germinai. No definitive guides. Things I tried, what broke, and what earned its place.",
      featured: {
        title: "Drop the Bloat",
        excerpt:
          "Everything you hand a coding agent, it has to carry. Mine was hauling 35K tokens of instructions before I typed a word. A field note on cutting that to 13K, and on knowing when context stops earning its place.",
        /* Hand-pinned to the live post rather than derived from the feed: the
           homepage teaser is authored independently from the writing index. */
        href: "https://lorenzogermini.substack.com/p/drop-the-bloat",
        date: "2026-08-04T11:17:27.000Z",
        readingMinutes: 5,
      },
    },
    earlierRoles: [
      "A Stable Diffusion interior-design MVP, killed on the evidence",
      "Biomedical-literature summarisation at Burgeon Labs",
      "Fill-parameter ML at Roche",
      "EPFL MSc, Life Sciences Engineering",
    ],
    systems:
      "agent systems · eval harnesses & tracing · end-to-end shipping, coding agents in the loop",
  },
  /* Root-relative so `next/image` optimizes it: a studio portrait at 4:5, which
     is the aspect every frame that renders it uses. The JSON-LD absolutizes it
     against the canonical origin, the one consumer that needs a full URL. */
  avatarUrl: "/lorenzo-germini-portrait.jpg",
  personalWebsiteUrl: CANONICAL_ORIGIN,
  contact: {
    email: "lorenzo.germini@icloud.com",
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
        /* The printed CV's address row is its only contact surface, so it is
           trimmed to the routes a hiring reader uses. X stays everywhere the
           row is not: the homepage and the footer. */
        cv: false,
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
      badges: ["Cuneo, Italy"],
      title: "AI Engineer",
      start: "May 2025",
      end: "Present",
      description: [
        "Building the AI engine behind Complaion, a compliance automation platform that helps European SMEs get and keep ISO certifications.",
        "Agentic RAG over ISO documentation and the evaluation frameworks that show when it can't be trusted in production.",
        "Shipping AI product features and automation workflows end-to-end, from prototype to production.",
      ],
      homepageProof:
        "The AI engine behind the product: LLM agents doing compliance work over ISO documentation in the background, and the eval harness that shows when they can't be trusted.",
    },
    {
      company: "Stealth GenAI Startup",
      link: "",
      badges: ["Cuneo, Italy"],
      title: "Founding AI Engineer",
      start: "Nov 2024",
      end: "Apr 2025",
      description: [
        "Built the backend and GenAI API layer from zero on AWS (DynamoDB, Amplify, Lambda) for an EdTech product.",
        "RAG stack on pgai with custom parsing pipelines for machine-readable and handwritten content, plus tracing and evaluation workflows to tune prompts and retrieval quality.",
        "Led MVP engineering, managing two other developers.",
      ],
      homepageProof:
        "Backend and GenAI API layer from zero on AWS; a RAG stack with custom parsing for handwritten input, plus the tracing and evals to tune retrieval.",
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
        "Took a personalized-medicine filling prototype through hardware-software integration testing, and built a gradient-boosted tree ML model for fill parameter tuning, 20% faster than manual.",
      ],
    },
  ],
  skills: [
    "LLM agents",
    "RAG",
    "Evals & tracing",
    "Full-stack development",
    "Python",
  ],
  skillGroups: [
    {
      name: "AI systems",
      skills: ["LLM agents", "RAG", "Evals & tracing"],
    },
    {
      name: "Product engineering",
      skills: ["Full-stack development", "Python", "Coding agents in the loop"],
    },
  ],
  projects: [
    {
      title: "L'Oracolo della Ghigliottina",
      techStack: ["Side Project", "Live"],
      description:
        "AI game companion for La Ghigliottina, the cult final round of Italy's most-watched quiz show. Send the five clue words, typed or snapped from the TV, and it finds the one that connects them. 100% accuracy so far, with rate-limit handling because Italians take this game seriously.",
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
      homepage: false,
      description:
        "MSc thesis work: an end-to-end pipeline that turns full-text biomedical papers into either a detailed analysis or a TL;DR, tuned on longevity and human-health literature.",
      link: {
        label: "Biomedical Paper Summarizer",
        href: "https://huggingface.co/spaces/Blaise-g/summarize-biomedical-papers-long-summary-or-tldr",
      },
    },
  ],
} as const;
