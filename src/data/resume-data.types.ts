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
  /** What kinds of work Lorenzo is the right person for, and what he is not.
   *  Written for an agent deciding whether he fits a brief: the exclusions are
   *  the load-bearing half, because a profile that fits everything rules out
   *  nothing (GH-116). Rendered nowhere in the HTML — its consumers are the two
   *  `llms` manifests, where it becomes the `When to use this` section.
   *
   *  Here rather than typed straight into those static files so the identity
   *  lockstep guard covers it: the manifests are hand-maintained, and GH-52 is
   *  the prior defect where prose only they held drifted for a release. Split
   *  into paragraphs on `\n\n`, which is how that guard matches them. The
   *  contact line the section ends with is not in here — it comes from
   *  `contact.email`, which already exists and would otherwise be a second
   *  copy. */
  agentGuidance: string;
  /** The `<title>` the search engines get, whole — name and separator included.
   *  Under 60 characters, the point where a SERP truncates; GH-99 found the
   *  title it replaced shipping at 110, rendering as `…shipping AI products
   *  end-to…`.
   *
   *  Stored rather than assembled from `name` and `roleLabel`, which today
   *  would produce it exactly: it is owner-approved copy (GH-100), and a SERP
   *  title should not silently rewrite itself because the masthead label was
   *  reworded. `metadata-length.spec.ts` asserts it still contains both, so
   *  the drift that buys is visible rather than silent. */
  metaTitle: string;
  /** `meta description`, `og:description`, `twitter:description` and the web
   *  manifest. Under 160 characters and a single paragraph — `summary` is a
   *  three-paragraph bio and shipped as a 901-character `meta` tag with four
   *  newlines in it (GH-99). Not a second bio: `summary` keeps the on-page prose,
   *  the JSON-LD `description` and both `llms` manifests, where length helps. */
  metaDescription: string;
  /** Every word of `/writing` that the feed does not supply. The essays, their
   *  dates and their excerpts come from Substack; this is the frame around
   *  them, and it is count-aware: the launch line appears for the first post
   *  and disappears the moment there is a second. */
  writingPage: {
    /** Plural on purpose — the count-aware lines below carry the honesty. */
    standfirst: string;
    /** Renders at exactly one essay, after the publication date. */
    cadence: string;
    leadCta: string;
    /** Only at 4+, and only below the subscribe module (decision 6). */
    archiveLabel: string;
  };
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
    /** One item per role with no `homepageProof` of its own, stacked one per line. */
    earlierRoles: readonly string[];
    /** The colophon stack line (spec decision 4 keeps it at the foot). */
    systems: string;
  };
  /** Root-relative, so `next/image` optimizes it. Consumers that need an
   *  absolute URL — the JSON-LD `image` — resolve it against
   *  `personalWebsiteUrl` themselves. Always 4:5. */
  avatarUrl: string;
  personalWebsiteUrl: string;
  contact: {
    email: string;
    /** The `@` form of the X profile in `social`, for `twitter:creator`. Stored
     *  rather than parsed out of the URL because every route that declares its
     *  own `twitter` object replaces the layout's wholesale and has to restate
     *  the handle (GH-102). */
    xHandle: string;
    /** Optional so removing the number is a one-line data edit rather than a
     *  code change. Every render site guards on it. */
    tel?: string;
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
    /** False keeps the project on the complete-record CV surfaces while the
     *  homepage grid omits it. Absent means it renders everywhere. */
    homepage?: boolean;
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
