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
      className="hover:border-accent hover:text-ink fixed top-4 right-4 z-50 rounded-full print:hidden"
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
