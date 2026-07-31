import { RESUME_DATA } from "@/data/resume-data";

export function buildPersonStructuredData(url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: RESUME_DATA.name,
    jobTitle: RESUME_DATA.roleLabel,
    description: RESUME_DATA.summary,
    url,
    image: RESUME_DATA.avatarUrl,
    sameAs: RESUME_DATA.contact.social.map((social) => social.url),
    email: RESUME_DATA.contact.email,
    telephone: RESUME_DATA.contact.tel,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Turin",
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
        name: "Turin",
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
