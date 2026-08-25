import { connection } from "next/server";

import { markdownResponse, renderCvMarkdown } from "@/lib/markdown-siblings";

/* GH-118 probe 4: is-agentic.com emits `Vary: Accept` from `/api/markdown`, so
   the strip is not universal. Hypothesis: it is the *prerender* that overwrites
   `Vary`, and a dynamic route's headers pass through. `writing.md` stays
   prerendered as the control. */
export async function GET() {
  /* `force-dynamic` is rejected outright under `cacheComponents`, so opting out
     of the prerender goes through `connection()` instead. */
  await connection();

  return markdownResponse(renderCvMarkdown());
}
