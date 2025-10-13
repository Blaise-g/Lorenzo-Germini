import { RESUME_DATA } from "@/data/resume-data";

export function StructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: RESUME_DATA.name,
    jobTitle: RESUME_DATA.work[0]?.title || "AI Engineer",
    description: RESUME_DATA.summary,
    url: RESUME_DATA.personalWebsiteUrl,
    image: RESUME_DATA.avatarUrl,
    sameAs: RESUME_DATA.contact.social.map((social) => social.url),
    email: RESUME_DATA.contact.email,
    telephone: RESUME_DATA.contact.tel,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Turin",
      addressCountry: "IT",
    },
    alumniOf: RESUME_DATA.education.map((edu) => ({
      "@type": "EducationalOrganization",
      name: edu.school,
    })),
    worksFor: RESUME_DATA.work.slice(0, 1).map((work) => ({
      "@type": "Organization",
      name: work.company,
      url: work.link,
    }))[0],
    knowsAbout: RESUME_DATA.skills,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
