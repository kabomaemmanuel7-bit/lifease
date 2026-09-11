import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div className="mb-4">
        {label && (
          <label
            htmlFor={id}
            className="mb-1.5 block text-sm font-medium text-ink-900"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "w-full rounded-md border border-wine-100 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400",
            "focus:border-wine-400 focus:outline-none",
            error && "border-red-400",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
