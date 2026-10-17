"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const switchCount = React.useRef(0);

  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");

    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = (event: React.MouseEvent<HTMLButtonElement>) => {
    const newTheme = theme === "light" ? "dark" : "light";
    /* The palette and the control's state change first; persisting is last
       and allowed to fail. `setItem` throws in some private modes, and thrown
       from inside a view transition's callback it rejected `finished` with the
       icon already flipped and the page still in the old palette. */
    const apply = () => {
      setTheme(newTheme);
      document.documentElement.classList.toggle("dark", newTheme === "dark");
      try {
        localStorage.setItem("theme", newTheme);
      } catch {}
    };

    /* A switch happens about once a visit, which is the tier where a longer
       beat is allowed: the new palette is revealed as a circle growing out of
       the control that asked for it, so the change has an origin instead of
       the whole page flashing at once. Where the API is missing the switch
       stays instant. Under reduced motion the circle — a shape sweeping across
       the screen — becomes a short crossfade: the palette still changes
       visibly, but nothing travels. */
    if (!document.startViewTransition) {
      apply();
      return;
    }
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const { left, top, width, height } =
      event.currentTarget.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );

    /* Colour transitions are frozen for the swap: the new snapshot is taken on
       the next frame, and a link still easing towards its new colour would be
       captured at its old one and then pop once the reveal finished. */
    const root = document.documentElement;
    /* A second click inside the reveal skips this transition, and its
       `finished` then settles while the next one is still capturing — so only
       the latest switch may lift the freeze. */
    const switchId = String(++switchCount.current);
    root.dataset.themeSwitching = switchId;
    const transition = document.startViewTransition(() => {
      flushSync(apply);
    });
    transition.ready
      .then(() => {
        root.animate(
          reduceMotion
            ? { opacity: [0, 1] }
            : {
                clipPath: [
                  `circle(0px at ${x}px ${y}px)`,
                  `circle(${radius}px at ${x}px ${y}px)`,
                ],
              },
          {
            duration: reduceMotion ? 200 : 500,
            easing: "cubic-bezier(0.23, 1, 0.32, 1)",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      })
      .catch(() => {});
    transition.finished
      .catch(() => {})
      .finally(() => {
        if (root.dataset.themeSwitching === switchId) {
          delete root.dataset.themeSwitching;
        }
      });
  };

  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={toggleTheme}
      /* A stable hook, because the accessible name is state now and the suite
         locates this control for chrome geometry rather than for its label. */
      data-testid="theme-toggle"
      /* In flow since GH-89, placed by whichever masthead renders it: fixed at
         `top-4 right-4` it sat in the top-right band on its own, and every
         shell paid for it twice — an asymmetric `pr-20` gutter so the nav could
         not slide under it, and top padding so the masthead rule cleared its
         bottom edge. Nothing here positions it; the caller does. */
      /* `h-9 w-9` over the `icon` size's 44px box, with `touch-target` supplying
         the 44px *hit* area: in a masthead row the 44px box is the tallest thing
         in it, so it — not the name — would set the header's height. Same trade
         the footer and section-nav links already take. */
      className="touch-target press hover:border-accent hover:text-ink h-9 w-9 rounded-full print:hidden"
      /* The icon is the only state indicator, and it is invisible to a screen
         reader: a static "Toggle theme" left a user unable to tell which mode
         was on. `aria-pressed` reports it, and the label names the mode the
         control is in rather than the action, so the two agree. */
      aria-label={theme === "dark" ? "Dark mode" : "Light mode"}
      aria-pressed={theme === "dark"}
    >
      {/* Both icons stay mounted and the `.dark` class picks one, so the
          swap can cross rather than cut — and the icon is right from the first
          paint, where reading `theme` showed a moon in dark mode until the
          effect above had run. Scale and blur together make the two read as
          one glyph changing shape rather than two swapping places. */}
      <span className="relative size-4">
        <Moon className="theme-icon absolute inset-0 size-4 dark:scale-25 dark:opacity-0 dark:blur-[4px]" />
        <Sun className="theme-icon absolute inset-0 size-4 scale-25 opacity-0 blur-[4px] dark:scale-100 dark:opacity-100 dark:blur-none" />
      </span>
    </Button>
  );
}
