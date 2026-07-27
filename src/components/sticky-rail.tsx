"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type HubDestination = {
  id: string;
  label: string;
};

function useActiveDestination(destinations: readonly HubDestination[]) {
  const [activeId, setActiveId] = React.useState(destinations[0]?.id);

  React.useEffect(() => {
    const sections = destinations.flatMap(({ id }) => {
      const section = document.getElementById(id);
      return section ? [section] : [];
    });
    if (sections.length === 0) return;

    const chooseActiveSection = () => {
      const activationLine = window.innerHeight * 0.28;
      const passed = sections.filter(
        (section) => section.getBoundingClientRect().top <= activationLine,
      );
      setActiveId((passed.at(-1) ?? sections[0]).id);
    };

    const observer = new IntersectionObserver(chooseActiveSection, {
      rootMargin: "-20% 0px -65% 0px",
      threshold: [0, 1],
    });

    sections.forEach((section) => observer.observe(section));
    chooseActiveSection();

    return () => observer.disconnect();
  }, [destinations]);

  return activeId;
}

export function StickyRailNavigation({
  destinations,
}: {
  destinations: readonly HubDestination[];
}) {
  const activeId = useActiveDestination(destinations);

  return (
    <nav
      aria-label="Page sections"
      className="border-border flex flex-col border-t pt-4 font-mono text-xs tracking-[0.12em] uppercase"
    >
      {destinations.map(({ id, label }) => {
        const isActive = activeId === id;

        return (
          <a
            key={id}
            href={`#${id}`}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "touch-target hover:text-accent border-l py-1.5 pl-3 underline-offset-4 transition-colors hover:underline",
              isActive
                ? "border-l-accent text-accent"
                : "text-faint border-l-transparent",
            )}
          >
            {label}
          </a>
        );
      })}
    </nav>
  );
}
