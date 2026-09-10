import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

const variantStyles: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-wine-600 text-white hover:bg-wine-700 active:bg-wine-800",
  secondary:
    "bg-white text-wine-600 border border-wine-200 hover:bg-wine-50",
  ghost: "bg-transparent text-ink-900 hover:bg-black/5",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md px-5 py-3 text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
