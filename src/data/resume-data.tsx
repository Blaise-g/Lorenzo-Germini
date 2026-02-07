import {
    ConsultlyLogo,
    JarockiMeLogo,
    MonitoLogo,
    ParabolLogo,
  } from "@/images/logos";
  import { GitHubIcon, LinkedInIcon, XIcon } from "@/components/icons";
  import { ResumeData } from "./resume-data.types";
  
  export const RESUME_DATA: ResumeData = {
    name: "Lorenzo Germini",
    initials: "LG",
    location: "Turin, Italy, CET",
    locationLink: "https://www.google.com/maps/place/Torino",
    about: "Multi-hat ninja who likes to build cool stuff to create meaningful impact for people at scale",
    summary: "As a Full-Stack AI Engineer with a generalist mindset, I thrive at the intersection of technical execution, product development, and business strategy in fast-paced environments. I have a track record of architecting and deploying production AI systems end-to-end -- from multi-provider LLM infrastructure and agentic RAG pipelines to full-stack product features -- while effectively bridging the gap between engineering depth and commercial intuition.\n\nMy path through data science in pharmaceutical manufacturing, AI R&D in digital health, founding an AI startup, and now building the AI engine behind a compliance platform has reinforced a core belief: the most impactful AI engineers connect technical capability to real user problems.\n\nFueled by an entrepreneurial drive, I'm passionate about leveraging a versatile skillset -- combining deep AI engineering expertise with product acumen and cross-functional collaboration skills -- to navigate uncertainty and deliver tangible results from concept to production. I spend my free time engaged in sports, experimenting with Generative AI side projects, and voraciously consuming content on tech entrepreneurship, personal finance, and biohacking.",
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
        degree: "MSc in Life Sciences Engineering (specialization in Neuroscience & Neuroengineering)",
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
        logo: MonitoLogo,
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
        logo: MonitoLogo,
        start: "Nov 2024",
        end: "Apr 2025",
        description: [
          "Spearheaded the development of a EdTech web application product, architecting and implementing the backend infrastructure on AWS (DynamoDB, Amplify, Lambda) and Generative AI API layer (OpenAI & Gemini with structured outputs) from the ground up.",
          "Engineered a robust Retrieval-Augmented Generation (RAG) application utilizing pgai, incorporating custom-built and state-of-the-art parsing pipelines to handle diverse input formats containing both machine-readable and handwritten text.",
          "Set up LLM tracing (LangSmith) and evaluation pipelines to enable systematic refinement of prompts, LLM outputs and RAG parameters.",
          "Oversaw the development team in collaboration with the Product Manager, taking on a leadership role in addition to core engineering responsibilities for the MVP, and contributing significantly to product strategy.",
        ],
      },
      {
        company: "GSK",
        link: "https://www.gsk.com/en-gb/home/",
        badges: ["Lille, France"],
        title: "AI Engineer - AI, Digital Twins & Intelligent Autonomous Systems",
        logo: MonitoLogo,
        start: "Aug 2024",
        end: "Oct 2024",
        description: [
          "Developed a POC for an anomaly detection system leveraging Sentence Transformers for semantic clustering of maintenance reports and anomaly descriptions.",
          "Implemented time series forecasting models for predictive maintenance, combining NLP insights with temporal patterns to enhance fault prediction in pharmaceutical manufacturing equipment.",
          "Explored generative AI use cases, including the use of agents, to optimize production processes and enable intelligent decision-making.",
        ],
      },
      {
        company: "GSK",
        link: "https://www.gsk.com/en-gb/home/",
        badges: ["Saint-Amand-les-Eaux, France"],
        title: "Data Scientist - Technical Services",
        logo: MonitoLogo,
        start: "Sep 2023",
        end: "Jul 2024",
        description: [
          "Led comprehensive analysis of multi-source sensor data for water consumption optimization, implementing Python to identify inefficiencies in Distillators and WFI systems. Designed and managed water rejection strategies projected to save 10,000 m³ annually through combined hardware upgrades and real-time software optimization.",
          "Created a Streamlit analytics dashboard for clean utilities equipment to monitor KPIs, enabling proactive maintenance and reducing reliance on external companies. This innovation saved costs, cut manual data inspection time by 50%, and earned a silver recognition award for its impact on operational efficiency.",
          "Developed a proof-of-concept combining gpt-4o-mini and PandasAI to enable natural language interactions with operational data. Built a conversational interface allowing users to query complex datasets through natural language, automatically generating relevant visualizations and data-driven insights.",
        ],
      },
      {
        company: "Self Employed",
        link: "https://liceocuneo.it/",
        badges: ["Cuneo, Italy"],
        title: "Teacher and Digital Freelancer",
        logo: ConsultlyLogo,
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
        logo: JarockiMeLogo,
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
        logo: ParabolLogo,
        start: "Jul 2021",
        end: "Oct 2021",
        description: [
          "Managed development of customized filling machine prototype for personalized drug supply, including hardware-software integration testing and collaboration with external partners.",
          "Improved tuning of filling prototype by creating a Machine Learning model (gradient-boosted tree) to optimize fill parameter determination for Personalized Medicine solutions, reducing tuning time by 20% compared to manual methods.",
          "Emphasized the practical applications of machine learning to drive innovation in personalized medicine, showcasing ability to translate technical expertise into real-world impact.",
        ],
      },
    ],
    skills: [
      "Generative AI",
      "LLMs",
      "RAG",
      "Python",
      "Data Science",
    ],
    projects: [
      {
        title: "Kailas Italy Store Locator Website",
        techStack: ["Side Project", "Front-end Development", "Generative AI", "Claude", "Node.js"],
        description: "Developed a website for Kailas Italia featuring trail running and hiking products with an integrated Store Locator. This side project was a deep dive into front-end development, starting from zero knowledge. Leveraging Node.js and guidance from Claude 3.5 Sonnet, I rapidly learned and implemented core web development concepts. Completed in just 2 weeks during holidays, this project demonstrates my ability to quickly acquire new skills.",
        logo: ConsultlyLogo,
        link: {
          label: "Kailas Italia Store Locator",
          href: "https://kailasitalia.replit.app/",
        },
      },
      {
        title: "Biomedical Paper Summarizer",
        techStack: ["MSc Thesis Project", "Generative AI", "PyTorch", "Python", "Gradio"],
        description: "Developed a Generative AI powered tool for extracting key takeaways from biomedical papers with adjustable levels of detail. Created an end-to-end pipeline for processing full-text research articles into both detailed analyses and concise TL;DR formats, focusing on longevity and human health domains.",
        logo: ParabolLogo,
        link: {
          label: "Biomedical Paper Summarizer",
          href: "https://huggingface.co/spaces/Blaise-g/summarize-biomedical-papers-long-summary-or-tldr",
        },
      },
    ],
  } as const;
