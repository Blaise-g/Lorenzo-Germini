import { PATH_STEPS } from "@/data/path";

/* The server cannot see the fragment, so the HTML is rendered at the default
   step. These two let a load of `/path#lille` still paint Lille (storyboard
   §7.4; GH-141, decision 13) without a runtime read, so the route stays
   static under Cache Components. */

const slugs = PATH_STEPS.map((step) => step.slug);

/** Inline, right after the header and before the panels: it runs before the
 *  first paint. It reads the fragment as `stepFromFragment` does — decoded,
 *  and only a step's slug — and puts that step on the overlay root, which is
 *  its parent, and on "Flat site", which the header above has already
 *  parsed. Any other fragment leaves the default step, as `useSelectedStep`
 *  does on load. */
export const OVERLAY_FIRST_PAINT_SCRIPT = `(function(){try{var slugs=${JSON.stringify(slugs)};var step=decodeURIComponent(location.hash.slice(1));if(slugs.indexOf(step)===-1)return;var root=document.currentScript.parentElement;root.setAttribute("data-path-shown",step);var link=root.querySelector("[data-path-flat-site-link]");if(link)link.setAttribute("href","/#"+step)}catch(e){}})()`;

/** Every panel and stage backdrop is `display: none` — out of the
 *  accessibility tree too — but the one `data-path-shown` names. Generated from the slugs, so a step added
 *  to the data cannot be left without a rule. The server renders the root at
 *  the default step, so with JavaScript off that step's panel shows. */
export const OVERLAY_PANEL_CSS = [
  "[data-path-overlay] [data-path-panel],[data-path-overlay] [data-path-backdrop]{display:none}",
  ...slugs.map(
    (slug) =>
      `[data-path-overlay][data-path-shown="${slug}"] :is([data-path-panel="${slug}"],[data-path-backdrop="${slug}"]){display:block}`,
  ),
].join("");

const mostLines = Math.max(...PATH_STEPS.map((step) => step.lines.length));

/** A caption line lit as its prop lands (storyboard §7.4): ink instead of
 *  body, with the piece's accent dot in the gutter. The stage puts the lit
 *  indices on the overlay root as `data-path-lit`; only the shown panel is
 *  displayed, so only its lines can light. One rule per index the data can
 *  reach, generated so a longer step cannot be left without one. */
export const CAPTION_LIT_CSS = [
  "[data-path-text-panel] [data-path-line]{position:relative;transition:color 300ms var(--ease-out)}",
  "[data-path-text-panel] [data-path-line]::before{content:'';position:absolute;left:-1rem;top:0.7em;width:0.375rem;height:0.375rem;border-radius:9999px;background:var(--color-accent);opacity:0;transition:opacity 300ms var(--ease-out)}",
  ...Array.from({ length: mostLines }, (_, index) => {
    const line = `[data-path-overlay][data-path-lit~="${index}"] [data-path-text-panel] [data-path-line="${index}"]`;
    return `${line}{color:var(--color-ink)}${line}::before{opacity:1}`;
  }),
].join("");
