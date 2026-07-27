export type ResumeData = {
  name: string;
  initials: string;
  location: string;
  locationLink: string;
  about: string;
  /**
   * The settled positioning. Deliberately not derived from `work[0].title`,
   * which is the employer-accurate job title and must stay that way.
   */
  positioning: {
    label: string;
    line: string;
  };
  summary: string;
  avatarUrl: string;
  personalWebsiteUrl: string;
  contact: {
    email: string;
    tel: string;
    social: {
      name: string;
      url: string;
      icon: React.ComponentType;
    }[];
  };
  education: {
    school: string;
    degree: string;
    grade?: string;
    start: string;
    end: string;
  }[];
  work: {
    company: string;
    link: string;
    badges: string[];
    title: string;
    start: string;
    end: string;
    description: string | string[];
    customBullet?: string;
  }[];
  skills: string[];
  skillGroups: {
    name: string;
    skills: string[];
  }[];
  projects: {
    title: string;
    techStack: string[];
    description: string;
    link?: {
      label: string;
      href: string;
    };
  }[];
  certification?: {
    name: string;
    providerName: string;
    link: string;
    issueDate: string;
    expirationDate: string;
    certificateId: string;
  }[];
  publication?: {
    name: string;
    providerName: string;
    link: string;
    issueDate: string;
    description: string;
  }[];
};
