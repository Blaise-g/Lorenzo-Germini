"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");

    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
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
      className="touch-target hover:border-accent hover:text-ink h-9 w-9 rounded-full print:hidden"
      /* The icon is the only state indicator, and it is invisible to a screen
         reader: a static "Toggle theme" left a user unable to tell which mode
         was on. `aria-pressed` reports it, and the label names the mode the
         control is in rather than the action, so the two agree. */
      aria-label={theme === "dark" ? "Dark mode" : "Light mode"}
      aria-pressed={theme === "dark"}
    >
      {theme === "light" ? (
        <Moon className="transition-refined h-4 w-4" />
      ) : (
        <Sun className="transition-refined h-4 w-4" />
      )}
    </Button>
  );
}
