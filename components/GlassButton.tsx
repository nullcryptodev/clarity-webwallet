"use client";

import { ButtonHTMLAttributes, FC, forwardRef, ReactNode } from "react";
import Link from "next/link";

type Size = "sm" | "md" | "lg";
type Variant = "solid" | "ghost" | "icon";

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-7 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

const ICON_SIZE_CLASSES: Record<Size, string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-11 w-11",
};

/**
 * A button that reads as a small piece of the same glass used
 * by the cards. Two visual modes:
 *
 *   solid  the button carries its own glass surface. Use
 *          sparingly -- a row of these reads as multiple
 *          floating pucks and competes with the cards.
 *
 *   ghost  no surface of its own; a hover tint only. Designed
 *          for use inside a GlassCard or a glass toolbar,
 *          where the surrounding surface already provides the
 *          glass.
 *
 *   icon   square, icon-only. Same as solid but sized for a
 *          single glyph and forced to a circle.
 *
 * Use `ghost` for grouped actions (a toolbar, a card header
 * action); use `solid` or `icon` when the button stands alone
 * on a non-glass background.
 */
type BaseProps = {
  children: ReactNode;
  size?: Size;
  variant?: Variant;
  className?: string;
};

type ButtonProps = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & {
    href?: undefined;
  };

type LinkProps = BaseProps & {
  href: string;
  onClick?: () => void;
};

type Props = ButtonProps | LinkProps;

export const GlassButton: FC<Props> = (props) => {
  const { children, size = "md", variant = "ghost", className } = props;

  const classes = buildClasses(size, variant, className);

  if ("href" in props && props.href !== undefined) {
    return (
      <Link href={props.href} onClick={props.onClick} className={classes}>
        <RaisedContent>{children}</RaisedContent>
      </Link>
    );
  }

  // Strip the custom props and forward the rest to <button>.
  const {
    children: _c,
    size: _s,
    variant: _v,
    className: _cn,
    href: _h,
    ...buttonProps
  } = props as ButtonProps & { href?: undefined };

  return (
    <button type="button" className={classes} {...buttonProps}>
      <RaisedContent>{children}</RaisedContent>
    </button>
  );
};

/**
 * The `liquid-glass` pseudo-elements sit at `z-index: 2` inside
 * the element's own stacking context. Ghost buttons don't have
 * that problem (no pseudo-elements), but solid and icon
 * variants do, so wrap content in a raised layer either way.
 * Cheap, and it keeps the API uniform.
 */
const RaisedContent: FC<{ children: ReactNode }> = ({ children }) => (
  <span className="relative z-10 inline-flex items-center justify-center gap-2">
    {children}
  </span>
);

function buildClasses(size: Size, variant: Variant, extra?: string): string {
  const base =
    "inline-flex items-center justify-center font-medium " +
    "transition-[transform,background-color] duration-150 transition-all" +
    "disabled:pointer-events-none disabled:opacity-50 " +
    "select-none cursor-pointer";

  const sizing =
    variant === "icon" ? ICON_SIZE_CLASSES[size] : SIZE_CLASSES[size];

  const rounded = variant === "icon" ? "rounded-full" : "rounded-lg";

  let surface: string;
  switch (variant) {
    case "solid":
      // Full glass, but with a tighter shadow than the card
      // class provides -- the card shadow is tuned for
      // card-sized elements and looks like a smudge on a
      // button. Override via arbitrary property.
      surface =
        "liquid-glass relative" +
        "shadow-[0_2px_10px_rgba(0,0,0,0.20),inset_0_1px_0.5px_rgba(255,255,255,0.28)] ";
      break;

    case "ghost":
      surface =
        "bg-transparent " +
        "text-foreground/90 " +
        "hover:bg-white/[0.08] active:bg-white/[0.12]";
      break;

    case "icon":
      surface =
        "liquid-glass relative" +
        "shadow-[0_2px_8px_rgba(0,0,0,0.18),inset_0_1px_0.5px_rgba(255,255,255,0.25)] ";
      break;
  }

  return [base, sizing, rounded, surface, extra ?? ""].join(" ");
}