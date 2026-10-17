import { TokenInfo } from "@claritychain/rpc";
import { ArrowLeft, Coins } from "lucide-react";
import Link from "next/link";
import { FC } from "react";

type props = {
  token: TokenInfo;
}

const Header: FC <props> = ({ token }) => {
  return (
    <div className="mb-6">
      <Link
        href={`/search/tokens/${token.id}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to token
      </Link>
      <div className="mt-4 flex items-center gap-3">
        <Coins className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-3xl font-semibold">
          Manage {token.name}
        </h1>
      </div>
      <p className="mt-1 text-muted-foreground">
        {token.symbol} · <span className="font-mono">#{token.id}</span>
      </p>
    </div>
  );
}

export default Header;