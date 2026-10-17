import { FC } from "react";

type props = {
  label: string;
  value: string
}

const Stat: FC <props> = ({ label, value }) => {
  return (
    <div className="rounded-lg border bg-muted/40 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export default Stat;