import { RESUME_DATA } from "@/data/resume-data";

/**
 * The one identifier for the one person this site is about.
 *
 * `/` and `/cv` both emit the Person, and without a shared `@id` a crawler has
 * two anonymous nodes and no statement that they are the same entity (GH-103).
 * Every other Person-shaped slot in the graph — `WebSite.author`,
 * `WebSite.publisher`, `Blog.author` — references this rather than restating a
 * name, so consolidation is asserted in the markup instead of guessed.
 */
export const PERSON_ID = new URL("#person", RESUME_DATA.personalWebsiteUrl)
  .href;

/**
 * The site's own identifier. Nothing points at it yet — `WebSite` is the only
 * node that carries it — but an identified site is what a later `isPartOf` from
 * `Blog` or a `WebPage` would have to reference, and the cost is one line.
 */
export const WEBSITE_ID = new URL("#website", RESUME_DATA.personalWebsiteUrl)
  .href;

/** A bare `@id` reference to {@link PERSON_ID}, for slots that point at it. */
export const PERSON_REFERENCE = { "@id": PERSON_ID } as const;

export function buildPersonStructuredData(url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": PERSON_ID,
    name: RESUME_DATA.name,
    jobTitle: RESUME_DATA.roleLabel,
    description: RESUME_DATA.summary,
    url,
    image: new URL(RESUME_DATA.avatarUrl, RESUME_DATA.personalWebsiteUrl).href,
    sameAs: RESUME_DATA.contact.social.map((social) => social.url),
    email: RESUME_DATA.contact.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Cuneo",
      addressRegion: "Piedmont",
      addressCountry: "IT",
    },
    alumniOf: RESUME_DATA.education.map((education) => ({
      "@type": "EducationalOrganization",
      name: education.school,
    })),
    worksFor: {
      "@type": "Organization",
      name: RESUME_DATA.work[0]?.company,
      url: RESUME_DATA.work[0]?.link,
    },
    knowsAbout: RESUME_DATA.skillGroups.flatMap((group) => group.skills),
    knowsLanguage: ["English", "Italian", "French"],
    hasOccupation: {
      "@type": "Occupation",
      name: RESUME_DATA.roleLabel,
      occupationalCategory: "15-1299.00",
      occupationLocation: {
        "@type": "City",
        name: "Cuneo",
      },
      skills: RESUME_DATA.skillGroups
        .flatMap((group) => group.skills)
        .join(", "),
    },
    hasCredential: RESUME_DATA.education.map((education) => ({
      "@type": "EducationalOccupationalCredential",
      name: education.degree,
      credentialCategory: "degree",
      recognizedBy: {
        "@type": "EducationalOrganization",
        name: education.school,
      },
    })),
  };
}
