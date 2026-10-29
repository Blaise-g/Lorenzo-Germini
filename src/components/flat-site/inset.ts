/* The flat site's horizontal inset, shared by its masthead, its body and the
   footer under it, so the footer's rule ends where this shell's content ends
   (ADR-0002). Symmetric since GH-89 put the theme toggle in the masthead: there
   is nothing fixed overhead to reserve a gutter against. */
export const FLAT_SITE_INSET =
  "mx-auto max-w-5xl px-6 md:px-10 print:max-w-none print:px-0";
