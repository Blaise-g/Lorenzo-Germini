import type { HubDestination } from "@/components/sticky-rail";
import { cn } from "@/lib/utils";

/* The in-page anchor row, shared by the hub shell and `/cv`. GH-87 asked `/cv` to
   reuse the homepage's pattern rather than invent a second one — the site
   already carries three different masthead treatments, and a second anchor row
   drifting from the first is how that happens again.
   The two callers differ only in top margin and in whether the row survives at
   `lg`: the hub replaces it with the sticky rail, `/cv` has no rail to replace
   it with. */
export function SectionAnchorRow({
  destinations,
  className,
}: {
  destinations: readonly HubDestination[];
  className?: string;
}) {
  return (
    <nav
      aria-label="On this page"
      /* `gap-y-4` is the 44px hit areas, measured: these rows are 28px tall and
         wrap to two lines at 375, so anything under 16px of separation puts each
         line's expanded target inside its neighbour's. */
      className={cn(
        "border-border font-label -mx-1 flex flex-wrap gap-x-1 gap-y-4 border-y py-1 text-xs tracking-[0.08em] uppercase print:hidden",
        className,
      )}
    >
      {destinations.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          className="touch-target text-faint hover:text-accent px-2 py-1.5 underline-offset-4 hover:underline"
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
