import { stepPeriod } from "@/components/flat-site/drawn-path";
import type {
  PathIllustration,
  PathLink,
  PathSideProp,
  PathStep,
} from "@/data/path.types";

const linkClassName =
  "text-accent decoration-border hover:decoration-accent touch-target underline underline-offset-4";

/* Each step and side prop is its own anchored section, with every word of its
   text in the server HTML: the path's links scroll here with JavaScript off,
   and role, dates and results are never behind a gesture (GH-141, decision 7). */
const sectionClassName =
  "max-w-[42rem] scroll-mt-8 print-keep-together print:scroll-mt-0";

function Links({ links }: { links: readonly PathLink[] }) {
  if (links.length === 0) return null;
  return (
    <p className="font-label flex flex-wrap gap-x-6 gap-y-5 text-xs tracking-[0.12em] uppercase print:hidden">
      {links.map((link) => (
        <a
          key={`${link.label}-${link.href}`}
          href={link.href}
          className={linkClassName}
        >
          {link.label}
        </a>
      ))}
    </p>
  );
}

/** The scene's blend, labelled as the illustration it is, with what it draws
 *  on (GH-141, decision 3). Text only until the scenes have stills. */
function Illustration({ illustration }: { illustration: PathIllustration }) {
  return (
    <p
      data-path-illustration
      className="text-faint border-border border-t pt-3 text-xs leading-relaxed text-pretty print:hidden"
    >
      {illustration.label}{" "}
      <span className="font-label tracking-[0.08em] uppercase">Drawn from</span>{" "}
      {illustration.inspirations.join(" · ")}
    </p>
  );
}

export function StepSection({ step }: { step: PathStep }) {
  const period = stepPeriod(step);
  const headingId = `${step.slug}-heading`;

  return (
    <section
      id={step.slug}
      aria-labelledby={headingId}
      data-path-step={step.slug}
      className={sectionClassName}
    >
      <h3
        id={headingId}
        className="font-display flex items-baseline gap-x-3 text-2xl leading-snug print:text-base"
      >
        {step.place}
        {period ? (
          <span
            data-path-date
            className="text-faint font-mono text-xs font-normal tabular-nums"
          >
            {period}
          </span>
        ) : null}
      </h3>

      {step.roles.length > 0 ? (
        <ul className="mt-3 space-y-2 print:mt-1 print:space-y-0">
          {step.roles.map((role) => (
            <li key={`${role.organisation}-${role.start}`}>
              {/* A degree is already one of the step's lines, word for word,
                  so its row keeps only the place and the dates. */}
              {step.lines.includes(
                `${role.title}, ${role.organisation}.`,
              ) ? null : (
                <p className="font-display text-lg leading-snug print:text-[13px]">
                  {role.title} · {role.organisation}
                </p>
              )}
              <p className="text-faint font-mono text-xs tabular-nums">
                {role.location} ·{" "}
                <span data-path-date>
                  {role.start} – {role.end}
                </span>
              </p>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="text-body mt-4 space-y-2 text-base leading-relaxed text-pretty print:mt-1 print:space-y-0.5 print:text-[12px] print:leading-[1.35]">
        {step.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <div className="mt-4 space-y-4 print:mt-0">
        <Links links={step.links} />
        <Illustration illustration={step.illustration} />
      </div>
    </section>
  );
}

/** A side project, beside the path rather than on it: no dates, because the
 *  data gives it none (GH-141, decision 2). Its title leads, since the
 *  sentences picked for it can open on "It". */
export function SidePropSection({ prop }: { prop: PathSideProp }) {
  const headingId = `${prop.slug}-heading`;

  return (
    <section
      id={prop.slug}
      aria-labelledby={headingId}
      data-path-side-prop={prop.slug}
      className={sectionClassName}
    >
      <h3
        id={headingId}
        className="font-display text-xl leading-snug italic print:text-base"
      >
        {prop.title}
      </h3>
      <div className="text-body mt-2 space-y-2 text-base leading-relaxed text-pretty print:mt-1 print:space-y-0.5 print:text-[12px] print:leading-[1.35]">
        {prop.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <div className="mt-3 print:hidden">
        <Links links={[prop.link]} />
      </div>
    </section>
  );
}
