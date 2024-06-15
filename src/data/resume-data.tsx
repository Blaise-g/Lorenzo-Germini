import {
  AmbitLogo,
  BarepapersLogo,
  BimLogo,
  CDGOLogo,
  ClevertechLogo,
  ConsultlyLogo,
  EvercastLogo,
  Howdy,
  JarockiMeLogo,
  JojoMobileLogo,
  Minimal,
  MobileVikingsLogo,
  MonitoLogo,
  NSNLogo,
  ParabolLogo,
  TastyCloudLogo,
  YearProgressLogo,
} from "@/images/logos";
import { GitHubIcon, LinkedInIcon, XIcon } from "@/components/icons";
import { ResumeData } from "./resume-data.types";

export const RESUME_DATA: ResumeData = {
  name: "Lorenzo Germini",
  initials: "LG",
  location: "Lille, France, CET",
  locationLink: "https://www.google.com/maps/place/Lille",
  about:
    "Data Scientist who enjoys solving complex problems to create meaningful impact on people's lives and the environment",
  summary:
    "Wide breadth of knowledge in Life Sciences with a focus on Pharmaceutical Manufacturing & Digital Health, complemented by expertise in Data Science (Python) and Machine Learning. My interdisciplinary background and analytical acumen have enabled me to leverage complex data, working collaboratively with teams to tackle real-world technical challenges in both pharmaceutical and startup environments. Driven by insatiable curiosity and a passion for learning, I continuously improve my skillset through dedicated self-development. I spend my free time engaged in sports, exciting personal projects, and voraciously consuming content on tech entrepreneurship, personal finance, and biohacking topics.",
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
      school: "Polytechnic of Turin",
      degree: "Bachelor's Degree in Electrical Engineering",
      start: "2017",
      end: "2020",
    },
    {
      school: "Swiss Federal Institute of Technology Lausanne (EPFL)",
      degree: "MSc in Life Sciences Engineering (specialization in Neuroscience & Neuroengingeering)",
      start: "2020",
      end: "2022",
    },
  ],
  work: [
    {
      company: "GSK",
      link: "https://www.gsk.com/en-gb/home/",
      badges: ["Saint-Amand-les-Eaux, France"],
      title: "Data Scientist (Graduate Programme)",
      logo: MonitoLogo,
      start: "Sep 2023",
      end: "Present",
      description: [
        "Led analysis of sensor data from various sources using Python and PowerBi to enhance water consumption monitoring, identifying inefficiencies, and initiating improvement projects.",
        "Designed and managed strategies for water rejection solutions in clean utilities, focusing on Distillators and WFI user levels, aiming to save 10,000 m³ annually through hardware upgrades and real-time software optimization.",
        "Created a Streamlit analytics dashboard for clean utilities equipment to monitor KPIs, enabling proactive maintenance and reducing reliance on external companies, saving costs and cutting manual data inspection time by 50%.",
        "Exploring Generative AI-powered features in the dashboard for automatic trend presentation and interactive data exploration.",
      ],
    },
    {
      company: "Self Employed",
      link: "https://liceocuneo.it/",
      badges: ["Cuneo, Italy"],
      title: "Teacher and Digital Freelancer",
      logo: MonitoLogo,
      start: "Dec 2022",
      end: "Aug 2023",
      description: [
        "Taught Math and Physics at my high-school alma mater, reconnecting with my hometown community. Shared my passion for STEM and fostered a renewed sense of purpose before the next chapter of my career.",
        "Developed and tested a Minimum Viable Product using Stable Diffusion for generating interior designs from empty space images. Partnered with local businesses to understand user preferences and market trends, leading to the project's closure due to limited interest.",
      ],
    {
      company: "Burgeon Labs",
      link: "https://www.burgeonlabs.com/",
      badges: ["Geneva, Switzerland"],
      title: "Engineering Intern",
      logo: MonitoLogo,
      start: "Feb 2022",
      end: "Oct 2022",
      description: [
        "Developed a Generative AI tool for researching scientific literature on longevity and human health, extracting evidence-based summaries in TLDR or extended format.",
        "Collaborated with the CEO to define product management strategies and streamline business processes for the company's first digital health product, leading to the establishment of a partnership with a renowned clinic.",
      ],
    },
    {
      company: "Roche",
      link: "https://www.roche.com/",
      badges: ["Basel, Switzerland"],
      title: "Summer Intern - 'Think Tank in Innovation & Sustainability'",
      logo: MonitoLogo,
      start: "Jul 2021",
      end: "Oct 2021",
      description: [
        "Managed development of customized filling machine prototype for personalized drug supply, including hardware-software integration testing and collaboration with external partners.",
        "Improved tuning of filling prototype by creating a Machine Learning model (gradient-boosted tree) to optimize fill parameter determination for Personalized Medicine solutions, reducing tuning time by 20% compared to manual methods used in other departments.",
      ],
    },
  ],
  skills: [
    "Data Science",
    "Python",
    "Machine Learning",
    "Generative AI",
    "Data Analytics",
    "PyTorch",
    "SQL",
    "Microsoft Power BI",
    "Digital Health",
    "Pharmaceutical Manufacturing",
    "Life Sciences",
  ],
  projects: [
    {
      title: "Anki Buddy",
      techStack: ["Side Project", "Generative AI", "ChatGPT"],
      description:
        "Custom GPT for seamless memory flashcards creation and export to maximise learning retention.",
      logo: MonitoLogo,
      link: {
        label: "Anki Buddy",
        href: "https://chat.openai.com/g/g-I56djVcjg-anki-buddy",
      },
    },
    {
      title: "Summarize biomedical papers in a long, detailed synopsis or TLDR summary",
      techStack: ["MSc Thesis Project", "Generative AI", "PyTorch", "Python", "Gradio"],
      description:
        "Working demo of Generative AI powered tool for extracting key takeaways from biomedical papers of interest according to a selected level of conciseness.",
      logo: MonitoLogo,
      link: {
        label: "Summarize biomedical papers in a long, detailed synopsis or TLDR summary",
        href: "https://huggingface.co/spaces/Blaise-g/summarize-biomedical-papers-long-summary-or-tldr",
      },
    },
  ],
} as const;
