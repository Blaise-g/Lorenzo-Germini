import type { CapabilitySignals } from "./fallback";

type NetworkInformation = { saveData?: boolean };

/** Reads what `decideFallback` needs from the browser, before any three.js
 *  loads, so a browser that gets the stills fetches no 3D code. Save-data is
 *  read first and short-circuits the probe: asking for a context costs
 *  nothing in bytes, but there is no reason to spend it. */
export function probeCapabilities(): CapabilitySignals {
  const connection = (
    navigator as Navigator & {
      connection?: NetworkInformation;
    }
  ).connection;
  const saveData = connection?.saveData === true;

  if (typeof WebGL2RenderingContext === "undefined") {
    return { webgl2: false, context: "failed", saveData };
  }
  if (saveData) return { webgl2: true, context: "ok", saveData };

  const strict = document
    .createElement("canvas")
    .getContext("webgl2", { failIfMajorPerformanceCaveat: true });
  if (strict) {
    /* The runtime makes its own context on its own canvas; this one is only a
       question, so it is handed back at once. */
    strict.getExtension("WEBGL_lose_context")?.loseContext();
    return { webgl2: true, context: "ok", saveData };
  }
  const plain = document.createElement("canvas").getContext("webgl2");
  plain?.getExtension("WEBGL_lose_context")?.loseContext();
  return {
    webgl2: true,
    context: plain ? "major-performance-caveat" : "failed",
    saveData,
  };
}
