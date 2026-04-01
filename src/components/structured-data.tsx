import { RESUME_DATA } from "@/data/resume-data";

export function StructuredData() {
  const personData = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    dateCreated: "2024-01-01",
    dateModified: "2026-04-01",
    mainEntity: {
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
        addressRegion: "Piedmont",
        addressCountry: "IT",
      },
      alumniOf: RESUME_DATA.education.map((edu) => ({
        "@type": "EducationalOrganization",
        name: edu.school,
      })),
      worksFor: {
        "@type": "Organization",
        name: RESUME_DATA.work[0]?.company,
        url: RESUME_DATA.work[0]?.link,
      },
      knowsAbout: RESUME_DATA.skills,
      knowsLanguage: ["English", "Italian", "French"],
      hasOccupation: {
        "@type": "Occupation",
        name: "AI Engineer",
        occupationalCategory: "15-1299.00",
        skills: RESUME_DATA.skills.join(", "),
      },
      hasCredential: RESUME_DATA.education.map((edu) => ({
        "@type": "EducationalOccupationalCredential",
        name: edu.degree,
        credentialCategory: "degree",
        recognizedBy: {
          "@type": "EducationalOrganization",
          name: edu.school,
        },
      })),
    },
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "h2", "[data-speakable]"],
    },
  };

  const websiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: `${RESUME_DATA.name} - Portfolio`,
    url: RESUME_DATA.personalWebsiteUrl,
    description: RESUME_DATA.summary,
    author: {
      "@type": "Person",
      name: RESUME_DATA.name,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteData) }}
      />
    </>
  );
}
