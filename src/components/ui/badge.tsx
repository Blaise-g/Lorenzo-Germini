import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/* A badge is a static label, not a control: it renders a plain div with no
   href, handler, or tab stop. Variants therefore carry no hover state — a
   colour shift under the cursor promises a click that never happens. */
const badgeVariants = cva(
  "inline-flex items-center rounded-md border bg-ground px-2 py-0.5 font-mono text-xs font-medium text-nowrap",
  {
    variants: {
      variant: {
        default: "border-accent text-accent",
        secondary: "border-border text-faint",
        outline: "border-border text-ink",
      },
    },

    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
