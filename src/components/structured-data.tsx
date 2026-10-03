import { RESUME_DATA } from "@/data/resume-data";
import {
  buildPersonStructuredData,
  PERSON_REFERENCE,
  WEBSITE_ID,
} from "@/lib/person-structured-data";

export function StructuredData() {
  const personData = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    /* Optional profile dates need a known creation or human-edit event. The
       previous creation day had no source, and a build is not a profile edit. */
    /* The defining Person node for this page, inline rather than an `@id`
       reference: Google's ProfilePage rich result reads `mainEntity` directly,
       and it now carries `PERSON_ID` so the other nodes can point at it. */
    mainEntity: buildPersonStructuredData(RESUME_DATA.personalWebsiteUrl),
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "h2", "[data-speakable]"],
    },
  };

  const websiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: `${RESUME_DATA.name} - Portfolio`,
    url: RESUME_DATA.personalWebsiteUrl,
    description: RESUME_DATA.summary,
    inLanguage: "en",
    author: PERSON_REFERENCE,
    publisher: PERSON_REFERENCE,
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
