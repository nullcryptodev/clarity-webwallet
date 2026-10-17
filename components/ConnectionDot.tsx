import { FC } from "react";

type props = {
  connected: boolean | null;
}

const ConnectionDot: FC <props> = ({ connected }) => {
  const color =
    connected === null
      ? "bg-yellow-500"
      : connected
        ? "bg-green-500"
        : "bg-red-500";

  const label = connected === null ? "Connecting…" : connected ? "Live" : "Offline";

  return (
    <div className="flex items-center gap-2 text-xs opacity-60">
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
};

export default ConnectionDot;