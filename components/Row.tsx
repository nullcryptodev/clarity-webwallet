import { FC, ReactNode } from "react";

type props = {
  label: string;
  value: ReactNode;
}

const Row: FC <props> = ({
  label, value
}) => {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

export default Row;