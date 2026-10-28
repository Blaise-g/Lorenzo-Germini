import {
  PathSteps,
  type PathStepNode,
} from "@/components/flat-site/path-steps";
import { stepPeriod } from "@/components/flat-site/step-period";
import type { PathSideProp, PathStep } from "@/data/path.types";

function stepNode(step: PathStep): PathStepNode {
  if (step.sceneId === "home") return "home";
  return step.sceneId === "open" ? "open" : "place";
}

/** The drawn path: seven step links in time order on a winding line, and the
 *  side projects off to one side. Every link is a plain anchor to its step's
 *  section, so the path works with JavaScript off; `PathSteps` is the client
 *  leaf that adds the piece and the seen ticks. The SVG is decoration; the
 *  list carries the meaning. */
export function DrawnPath({
  steps,
  sideProps,
}: {
  steps: readonly PathStep[];
  sideProps: readonly PathSideProp[];
}) {
  return (
    <nav
      aria-label="The path"
      data-testid="drawn-path"
      className="flex flex-col gap-8 sm:flex-row sm:items-center sm:gap-16 print:hidden"
    >
      <PathSteps
        steps={steps.map((step) => ({
          slug: step.slug,
          place: step.place,
          period: stepPeriod(step),
          node: stepNode(step),
        }))}
      />

      <div className="space-y-3">
        <p className="text-faint font-label text-xs tracking-[0.12em] uppercase">
          Beside the path
        </p>
        <ul className="border-border space-y-5 border-l border-dashed pl-4">
          {sideProps.map((prop) => (
            <li key={prop.slug}>
              <a
                href={`#${prop.slug}`}
                className="touch-target font-display hover:text-accent text-base italic underline-offset-4 hover:underline"
              >
                {prop.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
