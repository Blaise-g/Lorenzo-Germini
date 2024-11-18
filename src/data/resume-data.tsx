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
    "Results-driven Data Scientist with a solid foundation in Data Science, Generative AI, and Machine Learning. My interdisciplinary background and analytical acumen make me adept at leveraging complex data to identify trends, optimize processes, and tackle real-world business challenges. I have demonstrated my ability to collaborate with cross-functional teams to deliver data-driven insights and enhance operational efficiency in fast-paced environments in both Pharma and Startup sectors. Driven by insatiable curiosity and a passion for learning, I continuously improve my skillset through dedicated self-development. In my free time, I engage in sports, work on personal projects, and voraciously consume content on tech entrepreneurship, personal finance, and biohacking.",
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
      degree: "MSc in Life Sciences Engineering (specialization in Neuroscience & Neuroengineering)",
      start: "2020",
      end: "2022",
    },
  ],
  work: [
        {
      company: "GSK",
      link: "https://www.gsk.com/en-gb/home/",
      badges: ["Lille, France"],
      title: "Graduate Programme - AI, Digital Twins & Intelligent Autonomous Systems",
      logo: MonitoLogo,
      start: "Sep 2024",
      end: "Present",
      description: [
        "Analyzed anomaly descriptions and utilized time series forecasting for anomaly prediction and predictive maintenance in pharmaceutical manufacturing.",
        "Exploring generative AI use cases, including the use of agents, to optimize production processes and enable intelligent decision-making.",
      ],
    },
    {
      company: "GSK",
      link: "https://www.gsk.com/en-gb/home/",
      badges: ["Saint-Amand-les-Eaux, France"],
      title: "Graduate Programme - Technical Services",
      logo: MonitoLogo,
      start: "Sep 2023",
      end: "Aug 2023",
      description: [
        "Conducted comprehensive analysis of sensor data using Python and PowerBi, leading to significant improvements in water consumption monitoring and the initiation of impactful improvement projects.",
        "Developed and implemented strategies for optimizing water rejection processes in the Clean Utilities, resulting in an annual savings of 10,000 m³ through innovative hardware upgrades and real-time software solutions.",
        "Built a Streamlit analytics dashboard for clean utilities equipment to monitor KPIs, enabling proactive maintenance and reducing reliance on external companies. This innovation saved costs, cut manual data inspection time by 50%, and earned a silver recognition award for its impact on operational efficiency.",
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
    "Generative AI",
    "Data Science",
    "Python",
    "SQL",
    "Machine Learning",
    "AWS"
  ],
  projects: [
        {
      title: "Satirical Cartoons Generator",
      techStack: ["Generative AI", "Flux Pro 1.1", "Gemini Pro 1.5", "Side Project", "Glif"],
      description:
        "Developed a workflow leveraging Gemini 1.5 Pro for prompt generation and Flux 1.1 Pro for high-quality, colorful image rendering to generate humorous, satirical cartoons. The Glif platform allows users to input a topic, which is then transformed into a visually engaging and satirical cartoon with minimal user effort, combining AI-driven creativity with personalized satire.",
      logo: MonitoLogo,
      link: {
        label: "Satirical Cartoons Generator",
        href: "https://glif.app/@Lorenzo_Germini/glifs/cm2bywu8x0000v8nzez96s1z0",
      },
    },
        {
      title: "Kailas Italy Store Locator Website",
      techStack: ["Side Project", "Front-end Development", "Generative AI", "Claude", "Node.js"],
      description:
        "Developed a website for Kailas Italia featuring trail running and hiking products with an integrated Store Locator. This side project was a deep dive into front-end development, starting from zero knowledge. Leveraging Node.js and guidance from Claude 3.5 Sonnet, I rapidly learned and implemented core web development concepts. Completed in just 2 weeks during holidays, this project demonstrates my ability to quickly acquire new skills, adapt to new technologies, and deliver functional web solutions. It showcases my journey from complete beginner to creating a fully functional website, highlighting my aptitude for rapid learning and practical application of newfound knowledge.",
      logo: MonitoLogo,
      link: {
        label: "Kailas Italia Store Locator",
        href: "https://kailasitalia.replit.app/",
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
