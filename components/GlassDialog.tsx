"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

/**
 * The glass dialog: same structure as the plain `Dialog`, but the
 * popup's *surface* uses `.liquid-glass` instead of the solid
 * `bg-popover` panel. The overlay uses the same classes as the
 * plain dialog (lightly tinted, soft blur) so the two dialogs
 * behave identically — only the popup looks different.
 *
 * The popup keeps the plain dialog's `fixed top-1/2 left-1/2
 * -translate-x-1/2 -translate-y-1/2`, `grid`, `gap-6`, and
 * animation classes. `.liquid-glass` no longer declares
 * `position`, so the positioning utilities apply without a
 * cascade fight.
 */

function GlassDialog({ ...props }: DialogPrimitive.Root.props) {
  return <DialogPrimitive.Root data-slot="glass-dialog" {...props} />
}

function GlassDialogTrigger({ ...props }: DialogPrimitive.Trigger.props) {
  return (
    <DialogPrimitive.Trigger data-slot="glass-dialog-trigger" {...props} />
  )
}

function GlassDialogPortal({ ...props }: DialogPrimitive.Portal.props) {
  return <DialogPrimitive.Portal data-slot="glass-dialog-portal" {...props} />
}

function GlassDialogClose({ ...props }: DialogPrimitive.Close.props) {
  return <DialogPrimitive.Close data-slot="glass-dialog-close" {...props} />
}

function GlassDialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="glass-dialog-overlay"
      className={cn(
        // Identical to the plain dialog's overlay. The glass
        // popup is translucent, but a heavy overlay would
        // compound with its own backdrop-filter and make the
        // whole screen look washed out. Keeping the overlay
        // light lets the popup's own glass do the work.
        "fixed inset-0 isolate z-50 bg-black/50 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function GlassDialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.props & {
  showCloseButton?: boolean
}) {
  return (
    <GlassDialogPortal>
      <GlassDialogOverlay />
      <DialogPrimitive.Popup
        data-slot="glass-dialog-content"
        className={cn(
          // Positioning, sizing, and animation: same as the
          // plain dialog. These compose cleanly because
          // `.liquid-glass` does not set `position` or `display`.
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-6 p-6 text-sm outline-none sm:max-w-md lg:max-w-xl",
          "duration-100",
          "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
          "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          // The only change from the plain dialog: the surface.
          // `.liquid-glass` supplies the background, border,
          // border-radius (24px), and shadow stack. We drop
          // `rounded-xl`, `bg-popover`, and `ring-1
          // ring-foreground/10` because the class provides their
          // equivalents.
          "liquid-glass",
          // `relative` gives the glass pseudo-elements a
          // positioning context. Tailwind's `fixed` above
          // already positions the popup, but the pseudo-
          // elements and `.lg-blur` children still need an
          // ancestor with a definite box to resolve
          // `inset: 0` against — the popup itself serves that
          // role once it's positioned.
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="glass-dialog-close"
            render={
              <Button
                variant="outline"
                className="absolute top-4 right-4 lg:top-5.5 lg:right-5.5"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </GlassDialogPortal>
  )
}

function GlassDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function GlassDialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="glass-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <GlassDialogClose render={<Button variant="outline" />}>
          Close
        </GlassDialogClose>
      )}
    </div>
  )
}

function GlassDialogTitle({
  className,
  ...props
}: DialogPrimitive.Title.props) {
  return (
    <DialogPrimitive.Title
      data-slot="glass-dialog-title"
      className={cn("font-heading leading-none font-medium text-lg", className)}
      {...props}
    />
  )
}

function GlassDialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.props) {
  return (
    <DialogPrimitive.Description
      data-slot="glass-dialog-description"
      className={cn(
        "mt-2 text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  GlassDialog,
  GlassDialogClose,
  GlassDialogContent,
  GlassDialogDescription,
  GlassDialogFooter,
  GlassDialogHeader,
  GlassDialogOverlay,
  GlassDialogPortal,
  GlassDialogTitle,
  GlassDialogTrigger,
}