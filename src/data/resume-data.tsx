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
      title: "Data Scientist",
      logo: MonitoLogo,
      start: "Sep 2023",
      end: "Present",
      description: `
        <ul>
          <li>Streamlined site water consumption and rejections monitoring by spearheading the analysis of sensor data from multiple sources using Python and PowerBi, raising awareness about current inefficiencies and launching specific projects to improve them.</li>
          <li>Defined and managed implementation strategies for water rejection solutions in clean utilities focusing on Distillators and WFI user levels, projected to save up to 10,000 m³ of water annually, by performing minor hardware upgrades and optimizing software through real-time data analysis.</li>
          <li>Developed an analytics dashboard with Streamlit for clean utilities equipment to monitor KPIs and facilitate proactive maintenance, reducing reliance on external companies with the subsequent cost savings, and cutting time spent by technicians manually inspecting data by 50%.</li>
          <li>Experimenting with Generative AI-powered features in the dashboard to automatically present relevant trends and chat with data for seamless data exploration.</li>
        </ul>
      `,
    },
    {
      company: "Freelance",
      link: "https://liceocuneo.it/",
      badges: ["Cuneo, Italy"],
      title: "Teacher and Entrepreneur",
      logo: MonitoLogo,
      start: "Dec 2022",
      end: "Jul 2023",
      description:
        "• Taught Math and Physics at my high-school alma mater, delivering graduate-level knowledge through interactive lessons and hands-on experiments. This effort inspired the next generation of students and enhanced their understanding of complex concepts.\n• Reconnected with my hometown community, sharing my passion for STEM and fostering a renewed sense of purpose before the next chapter of my career.\n• Built and validated a Minimum Viable Product leveraging Stable Diffusion to propose new interior designs from photos of empty spaces. Collaborated with local businesses to gain insights into user needs and market demands, though the project was eventually retired due to low traction.",
    },
    {
      company: "Burgeon Labs",
      link: "https://www.burgeonlabs.com/",
      badges: ["Geneva, Switzerland"],
      title: "Engineering Intern (EPFL Master Thesis Project)",
      logo: MonitoLogo,
      start: "Feb 2022",
      end: "Oct 2022",
      description:
        "• Developed a Generative AI powered tool for researching scientific literature on longevity and human health, automatically extracting evidence-based takeaways in a TLDR or extended format.\n• Collaborated with the CEO to support the early development of the company’s first digital health product by defining product management strategies and streamlining business processes, contributing to the first partnership with renowned clinic.",
    },
    {
      company: "Roche",
      link: "https://www.roche.com/",
      badges: ["Basel, Switzerland"],
      title: "Summer Intern - 'Think Tank in Innovation & Sustainability'",
      logo: MonitoLogo,
      start: "Jul 2021",
      end: "Oct 2021",
      description:
        "• Oversaw development of customized filling machine prototype for personalized drug supply, performing hardware-software integration testing and facilitating the incorporation of outside partners (start-ups, companies) into workflows.\n• Accelerated the tuning of the filling prototype by designing a Machine Learning model (gradient-boosted tree) for accurate fill parameter determination for Personalized Medicine solutions, reducing tuning time by 20% compared to standard manual workflows used in other departments.",
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
