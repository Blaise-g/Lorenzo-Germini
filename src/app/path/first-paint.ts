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

/** Every panel is `display: none` — out of the accessibility tree too — but
 *  the one `data-path-shown` names. Generated from the slugs, so a step added
 *  to the data cannot be left without a rule. The server renders the root at
 *  the default step, so with JavaScript off that step's panel shows. */
export const OVERLAY_PANEL_CSS = [
  "[data-path-overlay] [data-path-panel]{display:none}",
  ...slugs.map(
    (slug) =>
      `[data-path-overlay][data-path-shown="${slug}"] [data-path-panel="${slug}"]{display:block}`,
  ),
].join("");
