"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { cn } from "cn"

/**
 * The glass popover: same public API as `Popover`, but the popup
 * surface uses `.liquid-glass` instead of the solid `bg-popover`
 * panel.
 *
 * The popup's default width is `w-72`, matching the plain
 * popover. Callers override it with `className`, most commonly
 * to `w-[var(--popover-trigger-width)]` so the dropdown matches
 * the trigger's width (see `TokenField`).
 *
 * `.liquid-glass` supplies the background, border, radius (24px),
 * shadow stack, and the `::before`/`::after` sheen. The popup
 * drops `rounded-md`, `bg-popover`, and `ring-1
 * ring-foreground/10` — the class provides their equivalents.
 */

function GlassPopover({ ...props }: PopoverPrimitive.Root.props) {
  return <PopoverPrimitive.Root data-slot="glass-popover" {...props} />
}

function GlassPopoverTrigger({
  ...props
}: PopoverPrimitive.Trigger.props) {
  return (
    <PopoverPrimitive.Trigger
      data-slot="glass-popover-trigger"
      {...props}
    />
  )
}

function GlassPopoverContent({
  className,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  ...props
}: PopoverPrimitive.Popup.props &
  Pick<
    PopoverPrimitive.Positioner.props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <PopoverPrimitive.Popup
          data-slot="glass-popover-content"
          className={cn(
            // Layout and animation: same as the plain popover.
            "z-50 flex w-72 origin-(--transform-origin) flex-col gap-4 p-4 text-sm outline-hidden",
            "duration-100",
            "data-[side=bottom]:slide-in-from-top-2",
            "data-[side=inline-end]:slide-in-from-left-2",
            "data-[side=inline-start]:slide-in-from-right-2",
            "data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2",
            "data-[side=top]:slide-in-from-bottom-2",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
            "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            // The only change from the plain popover: the surface.
            // `.liquid-glass` supplies background, border,
            // border-radius, and the sheen pseudo-elements.
            "liquid-glass",
            // Override the class's 44% background alpha with a darker
            // one suitable for a floating panel. Same RGB as the class
            // so the hue doesn't shift; only the opacity changes.
            "bg-[rgba(15,23,42,0.82)]",
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

function GlassPopoverHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-popover-header"
      className={cn("flex flex-col gap-1 text-sm", className)}
      {...props}
    />
  )
}

function GlassPopoverTitle({
  className,
  ...props
}: PopoverPrimitive.Title.props) {
  return (
    <PopoverPrimitive.Title
      data-slot="glass-popover-title"
      className={cn("font-medium", className)}
      {...props}
    />
  )
}

function GlassPopoverDescription({
  className,
  ...props
}: PopoverPrimitive.Description.props) {
  return (
    <PopoverPrimitive.Description
      data-slot="glass-popover-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  GlassPopover,
  GlassPopoverContent,
  GlassPopoverDescription,
  GlassPopoverHeader,
  GlassPopoverTitle,
  GlassPopoverTrigger,
}