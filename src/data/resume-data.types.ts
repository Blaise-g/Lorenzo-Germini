export type ResumeData = {
  name: string;
  initials: string;
  location: string;
  /** Masthead only. Short enough to stay on one line at 1024, which `about` — a
   *  full sentence — is not. Kept separate so rewording the bio cannot silently
   *  change the role label. */
  roleLabel: string;
  /** The Substack publication. Publication identity only (germinai), deliberately
   *  separate from the person identity the single-identity invariant guards —
   *  the name never feeds a byline, JSON-LD, or the LLM manifests. */
  newsletter: {
    name: string;
    url: string;
  };
  about: string;
  summary: string;
  /** Every word of homepage prose that is not already a CV field. Centralized
   *  here because the positioning is an experiment (spec §2.6 constraint 9):
   *  rewording the hero must cost one edit in one file, never a JSX hunt. */
  homepage: {
    hero: {
      /** The `<h1>`, split so the accent italic is data rather than markup. */
      headline: { lead: string; emphasis: string; trail: string };
      /** Carries the fold contract: >=3 technical terms and >=1 named system. */
      subhead: string;
      cta: string;
    };
    writing: {
      /** The only place the site says what the writing is. */
      standingLine: string;
      /** Hand-written teaser, not the post's opening. `href` points at the
       *  publication until the post is live; `date` and `readingMinutes` are
       *  absent until then and the meta line is omitted rather than guessed. */
      featured: {
        title: string;
        excerpt: string;
        href: string;
        date?: string;
        readingMinutes?: number;
      };
    };
    /** One line covering every role with no `homepageProof` of its own. */
    earlierRoles: string;
    /** The colophon stack line (spec decision 4 keeps it at the foot). */
    systems: string;
  };
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
    /** Hand-written, technically-led proof for the homepage's Work timeline
     *  (spec §2.6). Deliberately not derived from `description`: the first CV
     *  bullet is the business sentence for some roles and biography for others,
     *  so rendering it strips the technical nouns off the homepage. A role
     *  without one folds into `homepage.earlierRoles` instead of taking a row. */
    homepageProof?: string;
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
