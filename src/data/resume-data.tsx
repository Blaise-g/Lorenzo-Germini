import { GitHubIcon, LinkedInIcon, XIcon } from "@/components/icons";
import { ResumeData } from "./resume-data.types";

export const RESUME_DATA: ResumeData = {
  name: "Lorenzo Germini",
  initials: "LG",
  location: "Turin, Italy, CET",
  locationLink: "https://www.google.com/maps/place/Torino",
  roleLabel: "AI Product Engineer",
  newsletter: {
    name: "germinai",
    url: "https://lorenzogermini.substack.com",
  },
  about:
    "AI Product Engineer shipping production systems end-to-end across compliance, health, and education",
  summary:
    "AI Product Engineer with a generalist mindset, I operate at the intersection of technical execution, product thinking, and business strategy. My track record spans architecting multi-provider LLM infrastructure, agentic RAG systems, and full-stack AI product features — shipped end-to-end in fast-paced environments.\n\nFrom AI and intelligent systems in pharma manufacturing to AI R&D in digital health, founding a GenAI startup, and now building the AI engine behind a compliance platform — each step reinforced one belief: the best AI engineers connect technical depth to real user problems. Outside work, I'm into sports, GenAI side projects, and rabbit holes on tech entrepreneurship and biohacking.",
  avatarUrl: "https://avatars.githubusercontent.com/u/48798069?v=4",
  personalWebsiteUrl: "https://lorenzo-germini.vercel.app/",
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
        "Building the AI engine behind Complaion, a compliance automation platform helping European SMEs achieve and maintain ISO certifications.",
        "Architecting multi-provider LLM infrastructure (OpenAI, Claude, Gemini), agentic RAG systems, and AI evaluation frameworks.",
        "Shipping end-to-end AI product features while contributing to product strategy and supporting cross-functional teams with automation workflows.",
      ],
    },
    {
      company: "Stealth GenAI Startup",
      link: "",
      badges: ["Turin, Italy"],
      title: "Founding AI Engineer",
      start: "Nov 2024",
      end: "Apr 2025",
      description: [
        "Spearheaded the development of an EdTech web application product, architecting and implementing the backend infrastructure on AWS (DynamoDB, Amplify, Lambda) and the Generative AI API layer from the ground up.",
        "Engineered a robust RAG stack with pgai, custom and state-of-the-art parsing pipelines, plus tracing and evaluation workflows to systematically refine prompts, outputs, and retrieval quality across machine-readable and handwritten content.",
        "Led engineering execution for the MVP in close collaboration with the Product Manager, contributing to team coordination, product strategy, and end-to-end delivery.",
      ],
    },
    {
      company: "GSK",
      link: "https://www.gsk.com/en-gb/home/",
      badges: ["Saint-Amand-les-Eaux, France"],
      title: "AI Engineer",
      start: "Sep 2023",
      end: "Oct 2024",
      description: [
        "Led process optimization initiatives across pharmaceutical utilities, using Python and multi-source sensor data to identify inefficiencies and design water rejection strategies projected to save 10,000 m³ annually.",
        "Built predictive and anomaly-detection solutions for manufacturing operations, combining semantic NLP and time-series forecasting to improve fault detection and maintenance decision-making.",
        "Developed operational AI tools, including natural-language interfaces and generative AI use cases, to make plant data more accessible and support smarter production decisions.",
      ],
    },
    {
      company: "Self Employed",
      link: "https://liceocuneo.it/",
      badges: ["Cuneo, Italy"],
      title: "Teacher and Digital Freelancer",
      start: "Nov 2022",
      end: "Aug 2023",
      description: [
        "Taught Math and Physics at my high-school alma mater, reconnecting with my hometown community. Shared my passion for STEM and fostered a renewed sense of purpose before the next chapter of my career.",
        "Developed an interior design MVP using Stable Diffusion, implementing Dreambooth fine-tuning on personally curated datasets of room designs. Created custom training datasets through careful selection and preprocessing of interior design examples.",
        "Led comprehensive market research and user outreach efforts, engaging with interior design firms and potential customers to validate product-market fit. Leveraged insights to make a data-driven decision to conclude the project.",
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
        "Developed and deployed a Generative AI tool for biomedical literature analysis, leveraging fine-tuned language models trained on curated scientific datasets. Implemented an end-to-end pipeline for abstractive text summarization.",
        "Collaborated with the CEO to define product management strategies and streamline business processes for the company's first digital health product, successfully establishing a partnership with a renowned clinic.",
        "Actively engaged with various business functions to understand user needs and drive impactful solutions, demonstrating a strong commitment to improving health outcomes through technology.",
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
        "Managed development of customized filling machine prototype for personalized drug supply, including hardware-software integration testing and collaboration with external partners.",
        "Improved tuning of filling prototype by creating a Machine Learning model (gradient-boosted tree) to optimize fill parameter determination for Personalized Medicine solutions, reducing tuning time by 20% compared to manual methods.",
        "Emphasized the practical applications of machine learning to drive innovation in personalized medicine, showcasing ability to translate technical expertise into real-world impact.",
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
        "AI game companion for La Ghigliottina, the cult final round of Italy's most-watched quiz show L'Eredità. Players send 5 clue words (typed or snapped from TV) and the AI finds the single connecting word — having hit 100% accuracy so far, while being built to handle rate-limit abuse and optimize usage.",
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
        "Developed a Generative AI powered tool for extracting key takeaways from biomedical papers with adjustable levels of detail. Created an end-to-end pipeline for processing full-text research articles into both detailed analyses and concise TL;DR formats, focusing on longevity and human health domains.",
      link: {
        label: "Biomedical Paper Summarizer",
        href: "https://huggingface.co/spaces/Blaise-g/summarize-biomedical-papers-long-summary-or-tldr",
      },
    },
  ],
} as const;
