import { RESUME_DATA } from "@/data/resume-data";
import { BUILD_DATE_ISO } from "@/lib/build-metadata";
import { buildPersonStructuredData } from "@/lib/person-structured-data";

export function StructuredData() {
  const personData = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    dateCreated: "2024-01-01",
    dateModified: BUILD_DATE_ISO,
    mainEntity: buildPersonStructuredData(RESUME_DATA.personalWebsiteUrl),
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
