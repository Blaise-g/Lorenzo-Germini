"use client";

import { Button } from "@/components/ui/button";

export function PrintCvButton() {
  return (
    <Button
      type="button"
      onClick={() => window.print()}
      variant="outline"
      size="lg"
      className="touch-target rounded-none font-mono text-xs font-semibold"
    >
      Print CV
    </Button>
  );
}
