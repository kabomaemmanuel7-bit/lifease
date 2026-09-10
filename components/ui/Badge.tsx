import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "wine" | "success" | "warning" | "neutral";
};

const toneStyles: Record<NonNullable<BadgeProps["tone"]>, string> = {
  wine: "bg-wine-100 text-wine-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  neutral: "bg-ink-900/5 text-ink-600",
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-medium",
        toneStyles[tone],
        className
      )}
      {...props}
    />
  );
}
