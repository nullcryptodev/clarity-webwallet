import { FC, ReactNode } from "react";

type Props = {
  label: string;
  children: ReactNode;
  wide?: boolean;
  hint?: string;
};

const DetailRow: FC<Props> = ({ label, children, wide, hint }) => (
  <div className={wide ? "md:col-span-2" : undefined}>
    <div
      className="text-xs text-muted-foreground mb-1"
      title={hint}
    >
      {label}
    </div>
    <div>{children}</div>
  </div>
);

export { DetailRow };