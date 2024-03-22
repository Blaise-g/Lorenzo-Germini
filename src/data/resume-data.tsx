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

export const RESUME_DATA = {
  name: "Lorenzo Germini",
  initials: "LG",
  location: "Lille, France, CET",
  locationLink: "https://www.google.com/maps/place/Lille",
  about:
    "Multidisciplinary Data Scientist passionate about solving hard problems to make an impact on patients",
  summary:
    "Wide breadth of knowledge in Life Sciences with a focus on Pharmaceutical Manufacturing & Digital Health, complemented by expertise in Data Science (Python) and Machine Learning. My interdisciplinary background and analytical acumen have enabled me to leverage complex data, working collaboratively with teams to tackle real-world technical challenges in both pharmaceutical and startup environments. Driven by insatiable curiosity and a passion for learning, I continuously improve my skillset through dedicated self-development. I spend my free time engaged in sports, exciting personal projects in the Generative AI space, and voraciously consuming content on tech entrepreneurship, personal finance, and biohacking topics.",
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
      title: "Data Scientist",
      logo:  MonitoLogo,
      start: "Sep 2023",
      end: "Present",
      description:
        "Spearheaded the analysis of sensor data from diverse equipment using Python and SQL, resulting in a streamlined monitoring process of water consumption in Vaccines manufacturing. Led the definition and management of implementation strategies for water rejection solutions, projected to save up to 10,000 m³ of water annually demonstrating my ability to drive impactful outcomes. Currently developing a comprehensive analytics pipeline leveraging DataBricks and PowerBI designed to empower technicians and senior management in making data-driven decisions related data-driven decisions across multiple business critical activities. This initiative showcases my proficiency in translating complex data into actionable insights, driving operational efficiency and supporting the company's mission of delivering life-saving vaccines.",
    },
    {
      company: "Liceo Scientifico Cuneo",
      link: "https://liceocuneo.it/",
      badges: ["Cuneo, Italy"],
      title: "Math High School Teacher",
      logo:  MonitoLogo,
      start: "Dec 2022",
      end: "Jul 2023",
      description:
        "After completing my MSc, I took the opportunity to pause and recharge while making an impact. I returned to my roots at my high school alma mater, teaching Math and Physics to high school students. Imparting my graduate school knowledge to inspire the next generation was tremendously rewarding. This experience allowed me to reconnect with my hometown community and share my passion for STEM before embarking on the next chapter of my career. This gap period gave me perspective and renewed purpose.",
    },
    {
      company: "Burgeon Labs",
      link: "https://www.burgeonlabs.com/",
      badges: ["Geneva, Switzerland"],
      title: "Engineering Intern (EPFL Master Thesis Project)",
      logo:  MonitoLogo,
      start: "Feb 2022",
      end: "Oct 2022",
      description:
        "My master thesis investigates how a Natural Language Processing powered tool could be implemented to research the vast scientific literature on topics of longevity and human health and automatically extract evidence-based takeaways from relevant papers according to a selected level of conciseness. Beyond working on my thesis, I supported the early development of the company’s first digital health product alongside the CEO with a focus on product management and quantitative research.",
    },
    {
      company: "Roche",
      link: "https://www.roche.com/",
      badges: ["Basel, Switzerland"],
      title: "Summer Intern - 'Think Tank in Innovation & Sustainability'",
      logo:  MonitoLogo,
      start: "Jul 2021",
      end: "Oct 2021",
      description: "Oversaw the development of a customized filling machine prototype to supply drugs to patients based on individual demand. Performed hardware-software integration testing with a data-acquisition platform and facilitated fruitful incorporation of outside partners (start-ups, companies) into workflows. Within the same framework, I designed a Machine Learning model for accurate fill parameter determination in the context of Personalized Medicine solutions for drugs in the pipeline. Validating my results with various departments as well as delivering pitches to senior executives have enabled me to foster a culture of curiosity and collaboration while solving for real-world challenges in the Pharma Industry.",
    }
  ],
  skills: [
    "Data Science",
    "Python",
    "Machine Learning",
    "Generative AI",
    "Git",
    "PyTorch",
    "SQL",
    "Power BI",
    "Digital Health",
    "Pharmaceutical Manufacturing",
    "Neuroscience",
    "Life Sciences",
    "Effective Communication",
    "Strong Analytical Skills",
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
