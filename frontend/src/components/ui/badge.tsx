import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variant === "default" && "border-transparent bg-primary-500 text-white",
        variant === "secondary" && "border-transparent bg-secondary-500 text-white",
        variant === "outline" && "text-slate-950",
        className
      )}
      {...props}
    />
  )
}

export { Badge }

