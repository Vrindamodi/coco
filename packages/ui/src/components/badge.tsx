import { type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-muted)] text-[var(--color-foreground)]",
        success:
          "bg-[color-mix(in_srgb,var(--color-sage)_18%,white)] text-[var(--color-sage)]",
        warning:
          "bg-[color-mix(in_srgb,var(--color-warning)_18%,white)] text-[var(--color-warning)]",
        danger:
          "bg-[color-mix(in_srgb,var(--color-destructive)_14%,white)] text-[var(--color-destructive)]",
        accent:
          "bg-[color-mix(in_srgb,var(--color-primary)_14%,white)] text-[var(--color-primary)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { badgeVariants };
