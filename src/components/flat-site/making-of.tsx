import { MAKING_OF } from "@/data/making-of";

/* The foot of `/` on the prototype branch (GH-152): how the 3D path was made.
   Text only, set like the writing teaser above it. */
export function MakingOf() {
  const { intro, budgets, scenes, assets, voice } = MAKING_OF;
  return (
    <div className="max-w-[42rem] space-y-8">
      <p className="text-body text-base leading-relaxed text-pretty">{intro}</p>
      <MakingOfPart title={budgets.title} lines={budgets.lines} />
      <div data-making-of-part>
        <h3 className="font-display text-xl leading-snug">{scenes.title}</h3>
        <ul className="mt-3 space-y-4">
          {scenes.items.map((scene) => (
            <li key={scene.sceneId}>
              <p className="text-ink text-base">{scene.place}</p>
              <p className="text-body mt-1 text-base leading-relaxed text-pretty">
                {scene.inspirations.join("; ")}.
              </p>
              {scene.sources.length > 0 ? (
                <ul className="text-faint mt-2 flex flex-col items-start gap-y-5 text-sm leading-relaxed">
                  {scene.sources.map((source) => (
                    <li key={source.href}>
                      <a
                        className="touch-target hover:text-accent underline underline-offset-4"
                        href={source.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {source.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
      <MakingOfPart title={assets.title} lines={assets.lines} />
      <MakingOfPart title={voice.title} lines={voice.lines} />
    </div>
  );
}

function MakingOfPart({
  title,
  lines,
}: {
  title: string;
  lines: readonly string[];
}) {
  return (
    <div data-making-of-part>
      <h3 className="font-display text-xl leading-snug">{title}</h3>
      {lines.map((line) => (
        <p
          key={line}
          className="text-body mt-3 text-base leading-relaxed text-pretty"
        >
          {line}
        </p>
      ))}
    </div>
  );
}
