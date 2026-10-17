"use client";

import { FC, ReactNode } from "react";
import Link from "next/link";

type Size = "sm" | "md" | "lg";

const SIZE_PADDING: Record<Size, string> = {
  sm: "px-4 py-4",
  md: "px-6 py-5",
  lg: "px-8 py-7",
};

const SIZE_BLUR_LAYERS: Record<Size, 1 | 2 | 3> = {
  sm: 1,
  md: 2,
  lg: 3,
};

type GlassCardProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  icon?: FC<{ className?: string }>;
  action?: ReactNode;
  size?: Size;
  className?: string;
  iconClassName?: string;

  /**
   * Optional background image. Rendered edge-to-edge inside the
   * card's border radius, behind the glass surface and the
   * content. The image is NOT affected by the card's padding --
   * it fills the entire glass area regardless of `size`.
   *
   * Pass a public path (e.g. `/blue-waves.png`) or an imported
   * URL. The image is expected to be decorative; it is
   * `aria-hidden` and does not receive pointer events.
   *
   * `backgroundImageOpacity` controls how strongly it shows
   * through the glass. Default 1; lower it if the image is
   * busy and the content needs to sit above it clearly.
   */
  backgroundImage?: string;
  backgroundImageOpacity?: number;
};

export const GlassCard: FC<GlassCardProps> = ({
  children,
  title,
  description,
  icon: Icon,
  action,
  size = "md",
  className,
  iconClassName = "text-muted-foreground",
  backgroundImage,
  backgroundImageOpacity = 1,
}) => {
  const padding = SIZE_PADDING[size];
  const blurLayers = SIZE_BLUR_LAYERS[size];

  return (
    <div
      className={[
        "liquid-glass relative",
        // `overflow-hidden` clips the background image to the
        // border radius. The class already sets this, but
        // restating it here documents the dependency: if the
        // class ever drops it, the background image would spill.
        "overflow-hidden",
        padding,
        className ?? "",
      ].join(" ")}
    >
      {/*
       * Background image layer.
       *
       * Rendered first, absolutely positioned to fill the
       * card's box. `inset-0` reaches the edges regardless of
       * the card's padding, because padding only affects the
       * content box of a positioned element's parent -- an
       * absolutely-positioned child's `inset` is measured from
       * the parent's PADDING box, not its content box. That is
       * what makes the image fill edge-to-edge while the
       * content still respects the padding.
       *
       * Sits below the `.lg-blur` layers (which are also
       * inset-0) and below the content (`relative z-10`), so
       * the blur layers sample the image as part of the
       * backdrop, which is what makes the image look like it's
       * behind the glass rather than pasted on top of it.
       */}
      {backgroundImage && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('${backgroundImage}')`,
              opacity: backgroundImageOpacity,
            }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background/90" />
          </div>
        </>
      )}

      {blurLayers >= 1 && (
        <div className="lg-blur lg-blur-1" aria-hidden />
      )}
      {blurLayers >= 2 && (
        <div className="lg-blur lg-blur-2" aria-hidden />
      )}
      {blurLayers >= 3 && (
        <div className="lg-blur lg-blur-3" aria-hidden />
      )}

      <div className="relative z-10">
        {title && (
          <div className="mb-4 flex flex-row items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-medium">
                {Icon && <Icon className={`h-5 w-5 ${iconClassName}`} />}
                {title}
              </h2>
              {description && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            {action}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export const GlassPanel: FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div
      className={[
        "rounded-md border border-white/10 bg-white/[0.04]",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </div>
  );
};