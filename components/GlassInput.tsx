"use client"

import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

/**
 * Glass input: same API as `Input`, but the surface is a
 * frosted well rather than a bordered transparent box.
 *
 * The visual language differs from `GlassCard` / `GlassButton`.
 * Those are panels -- raised surfaces with a highlight sheen on
 * top. An input is a well: recessed, with a soft dark fill and
 * an inset top shadow. So this does NOT use the `.liquid-glass`
 * class (which paints a raised panel) -- it uses a lighter,
 * inset treatment that matches the glass family without
 * pretending the input is a card.
 *
 * States:
 *   default   a translucent white fill on a dark surface, with
 *             a hairline border and a subtle top inset shadow.
 *   focus     ring color follows the theme's `--ring`, same as
 *             the plain input.
 *   invalid   red border + red ring, matching `aria-invalid`.
 *   disabled  reduced opacity, cursor locked.
 */

function GlassInput({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="glass-input"
      className={cn(
        // Layout: identical to the plain input.
        "h-9 w-full min-w-0 rounded-md px-2.5 py-1 text-base md:text-sm",
        // File-input chrome, unchanged.
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        // Placeholder color, unchanged.
        "placeholder:text-muted-foreground",
        // The glass well: a slightly translucent white fill on
        // top of whatever surface the input sits on, a hairline
        // border, and an inset top shadow that reads as
        // "recessed". The `backdrop-blur-sm` softens the content
        // behind the input just enough that text on the input
        // stays legible regardless of what's under it.
        "border border-white/15 bg-white/[0.06] backdrop-blur-sm",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_0_rgba(0,0,0,0.10)]",
        // Transitions: color and box-shadow only. Transitioning
        // `background-color` here would animate the fill on
        // every hover, which reads as flckery.
        "transition-[color,box-shadow,border-color] outline-none",
        // Focus: the theme ring, same as the plain input.
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        // Invalid: red border and ring, same as the plain input.
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        "dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        // Disabled.
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { GlassInput }