"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { CommandIcon } from "lucide-react";

interface Props {
  links: { url: string; title: string }[];
}

export const CommandMenu = ({ links }: Props) => {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isCvRoute = pathname === "/cv";

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen((open) => !open)}
        className="border-border hover:border-accent hover:text-ink h-12 w-12 rounded-full shadow-lg print:hidden"
        aria-label="Open command menu"
      >
        <CommandIcon className="size-5" />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => {
                setOpen(false);
                if (isCvRoute) {
                  window.print();
                  return;
                }
                router.push("/cv");
              }}
            >
              <span>{isCvRoute ? "Print CV" : "View CV"}</span>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Links">
            {links.map(({ url, title }) => (
              <CommandItem
                key={url}
                onSelect={() => {
                  setOpen(false);
                  /* Matches the rel="noopener noreferrer" the anchors carry:
                     without windowFeatures the opened tab keeps a live
                     window.opener back into this page. */
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
              >
                <span>{title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
        </CommandList>
      </CommandDialog>
    </>
  );
};

export function CommandMenuHint() {
  const [isMac, setIsMac] = React.useState(true);

  React.useEffect(() => {
    setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform));
  }, []);

  return (
    <p className="border-t-border text-faint mt-12 hidden border-t p-2 text-center font-mono text-xs xl:block print:hidden">
      Press{" "}
      <kbd className="bg-ground text-faint border-border pointer-events-none inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-xs font-medium select-none">
        <span className="text-xs">{isMac ? "\u2318" : "Ctrl+"}</span>J
      </kbd>{" "}
      to open the command menu
    </p>
  );
}
