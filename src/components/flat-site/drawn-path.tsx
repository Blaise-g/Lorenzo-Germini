import type { PathSideProp, PathStep } from "@/data/path.types";

/* One row per step. 48px, so each link's 44px hit area clears its neighbours'
   with room to spare, and the SVG beside the list can place its nodes by
   arithmetic rather than by measuring the text. */
const ROW_PX = 48;
const GUTTER_PX = 40;
const SPINE_X = GUTTER_PX / 2;

function nodeY(index: number) {
  return ROW_PX * index + ROW_PX / 2;
}

/** The line the steps sit on: it swings out to one side and then the other
 *  between each pair of steps, so it reads as a walked path, not a timeline
 *  rule. */
function pathLine(count: number) {
  let line = `M ${SPINE_X} ${nodeY(0)}`;
  for (let index = 0; index < count - 1; index++) {
    const from = nodeY(index);
    const to = nodeY(index + 1);
    const swing = index % 2 === 0 ? GUTTER_PX - 4 : 4;
    line += ` C ${swing} ${from + 16}, ${swing} ${to - 16}, ${SPINE_X} ${to}`;
  }
  return line;
}

/** Home is a square: the path leaves it and comes back to it twice. A place is
 *  a dot, and "?" an open ring, because it is not yet written. */
function StepNode({ step, index }: { step: PathStep; index: number }) {
  const y = nodeY(index);
  if (step.sceneId === "home") {
    return (
      <rect
        x={SPINE_X - 5}
        y={y - 5}
        width={10}
        height={10}
        className="fill-accent"
      />
    );
  }
  if (step.sceneId === "open") {
    return (
      <circle
        cx={SPINE_X}
        cy={y}
        r={5}
        strokeWidth={1.5}
        strokeDasharray="2 2"
        className="fill-ground stroke-accent"
      />
    );
  }
  return <circle cx={SPINE_X} cy={y} r={5} className="fill-ink" />;
}

/** The step's label on the path: its place, then its period, or "home" for
 *  the first step, which has no dates. */
export function stepPeriod(step: PathStep) {
  if (step.period) return step.period;
  return step.sceneId === "home" && step.homeStage === 1 ? "home" : undefined;
}

/** The drawn path: seven step links in time order on a winding line, and the
 *  side projects off to one side. Every link is a plain anchor to its step's
 *  section, so the path works with JavaScript off. The SVG is decoration; the
 *  list carries the meaning. */
export function DrawnPath({
  steps,
  sideProps,
}: {
  steps: readonly PathStep[];
  sideProps: readonly PathSideProp[];
}) {
  const height = ROW_PX * steps.length;

  return (
    <nav
      aria-label="The path"
      data-testid="drawn-path"
      className="flex flex-col gap-8 sm:flex-row sm:items-center sm:gap-16 print:hidden"
    >
      <div className="relative flex">
        <svg
          aria-hidden="true"
          width={GUTTER_PX}
          height={height}
          viewBox={`0 0 ${GUTTER_PX} ${height}`}
          className="shrink-0 overflow-visible"
        >
          <path
            d={pathLine(steps.length)}
            fill="none"
            strokeWidth={1.5}
            strokeLinecap="round"
            className="stroke-border"
          />
          {steps.map((step, index) => (
            <StepNode key={step.slug} step={step} index={index} />
          ))}
        </svg>
        <ol className="ml-3">
          {steps.map((step) => {
            const period = stepPeriod(step);
            return (
              <li
                key={step.slug}
                className="flex items-center"
                style={{ height: ROW_PX }}
              >
                <a
                  href={`#${step.slug}`}
                  data-path-step-link={step.slug}
                  className="touch-target group gap-x-2 underline-offset-4"
                >
                  <span className="font-display group-hover:text-accent text-lg leading-none group-hover:underline">
                    {step.place}
                  </span>
                  {period ? (
                    <span
                      data-path-date
                      className="text-faint font-mono text-xs tabular-nums"
                    >
                      {period}
                    </span>
                  ) : null}
                </a>
              </li>
            );
          })}
        </ol>
      </div>

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
