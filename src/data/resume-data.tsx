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
    "Data Scientist who enjoys solving complex problems to create meaningful impact on people's lives",
  summary:
    "Results-driven Data Scientist with a solid foundation in Data Science, Analytics, and Machine Learning. My interdisciplinary background and analytical acumen make me adept at leveraging complex data to identify trends, optimize processes, and tackle real-world business challenges. I have demonstrated my ability to collaborate with cross-functional teams to deliver data-driven insights and enhance operational efficiency in fast-paced environments in both Pharma and Startup sectors. Passionate about making meaningful impacts on people's lives through technology and driven by insatiable curiosity, I continuously strive to improve my skillset and contribute to innovative projects. In my free time, I engage in sports, work on personal projects, and voraciously consume content on tech entrepreneurship, personal finance, and biohacking.",
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
        "Conducted comprehensive analysis of sensor data using Python and PowerBi, leading to significant improvements in water consumption monitoring and the initiation of impactful improvement projects.",
        "Developed and implemented strategies for optimizing water rejection processes in the Clean Utilities, resulting in an annual savings of 10,000 m³ through innovative hardware upgrades and real-time software solutions.",
        "Designed and deployed a Streamlit analytics dashboard to monitor key performance indicators (KPIs), facilitating proactive maintenance and reducing dependency on external companies, cutting costs and achieving a 50% reduction in manual data inspection time.",
        "Investigated and integrated Generative AI features to enhance data trend analysis and interactive exploration, improving data-driven decision-making.",
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
        "Taught Math and Physics at my high-school alma mater, reconnecting with my hometown community and fostering a passion for STEM subjects in the next generation of students.",
        "Developed and tested a Minimum Viable Product using Stable Diffusion for generating interior designs from empty space images. Partnered with local businesses to understand user preferences and market trends, leading to the project's closure due to limited interest.",
        "Demonstrated versatility and entrepreneurial spirit by wearing multiple hats in a fast-paced environment, balancing technical development with market research and user engagement.",
      ],
    },
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
        "Worked closely with the CEO to refine product management strategies and enhance business processes, contributing to the successful launch of a digital health product and securing a key partnership with a renowned clinic.",
        "Actively engaged with various business functions to understand user needs and drive impactful solutions, demonstrating a strong commitment to improving health outcomes through technology.",
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
        "Led the development of a customized filling machine prototype for personalized drug supply, coordinating hardware-software integration and collaborating with external partners to ensure project success.",
        "Enhanced the tuning process of the filling prototype by developing a gradient-boosted tree machine learning model, optimizing fill parameters and reducing tuning time by 20% compared to manual methods.",
        "Emphasized the practical applications of machine learning to drive innovation in personalized medicine, showcasing my ability to translate technical expertise into real-world impact.",
      ],
    },
  ],
  skills: [
    "Data Science",
    "Python",
    "SQL",
    "Machine Learning",
    "Generative AI",
    "Data Analytics",
    "Microsoft Power BI",
    "Digital Health",
    "Cross-Functional Collaboration",
    "Startup Experience",
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
