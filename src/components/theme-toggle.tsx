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
      className="hover:bg-primary hover:text-primary-foreground fixed top-4 right-4 z-50 rounded-full print:hidden"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <Moon className="transition-refined h-4 w-4" />
      ) : (
        <Sun className="transition-refined h-4 w-4" />
      )}
    </Button>
  );
}
