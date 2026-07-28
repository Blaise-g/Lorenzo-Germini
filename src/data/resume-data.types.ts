export type ResumeData = {
  name: string;
  initials: string;
  location: string;
  locationLink: string;
  /** Masthead only. Short enough to stay on one line at 1024, which `about` — a
   *  full sentence — is not. Kept separate so rewording the bio cannot silently
   *  change the role label. */
  roleLabel: string;
  about: string;
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
