/* Evaluated when this module is first loaded — build time for the statically
   prerendered homepage and sitemap, server start in dev. Every surface that
   reports when the site last changed reads these, so freshness metadata cannot
   drift the way a hardcoded date does. */
export const BUILD_DATE = new Date();

/** Build time as a schema.org `Date` (YYYY-MM-DD). */
export const BUILD_DATE_ISO = BUILD_DATE.toISOString().slice(0, 10);

/** Build month for the CV's human-readable freshness line. */
export const BUILD_MONTH_YEAR = new Intl.DateTimeFormat("en", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
}).format(BUILD_DATE);
