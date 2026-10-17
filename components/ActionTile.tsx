import { ComponentType, FC } from "react";
import Link from "next/link";
import { cn } from "cn";
import { GlassCard } from "./GlassCard";

type props = {
  href?: string;
  onClick?: () => void;
  icon: ComponentType<{ className?: string }>;
  label: string;
  description: string;
};

const ActionTile: FC<props> = ({
  href,
  onClick,
  icon: Icon,
  label,
  description,
}) => {
  const inner = (
    <GlassCard className="cursor-pointer hover:-translate-y-0.5 duration-150 active:translate-0">
      <div className="flex items-center gap-6">
        <Icon className="size-7 text-muted-foreground group-hover:text-sky-300/75 mx-auto" />

        <div className="flex flex-col w-full">
          <div className="font-medium">{label}</div>
          <div className="text-sm text-muted-foreground">
            {description}
          </div>
        </div>
      </div>
    </GlassCard>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="block w-full text-left"
      >
        {inner}
      </button>
    );
  }

  if (href) {
    return <Link href={href} className="block">{inner}</Link>;
  }

  return inner;
};

export default ActionTile;