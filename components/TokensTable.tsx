"use client";

import { useState } from "react";
import Link from "next/link";
import {
  formatTokenAmount,
  shortAddress,
} from "@claritychain/rpc";
import type { TokenInfo } from "@claritychain/rpc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import { useTokenMetadata, useTokenSupply } from "@/lib/hooks";
import { ManageTokenModal } from "./modal/manage-token";
import { TokenMetadata } from "@/lib/token-metadata";

/**
 * The decimals to use when displaying the native token's supply
 * and its decimals column.
 *
 * This is hardcoded because the daemon reports CLRTY's supply
 * in a unit that scales at 10^5, not the 10^18 the atomic-units
 * convention would imply. Every other formatter in the app that
 * deals with CLRTY balances uses 18 — those are per-address
 * balances, which the daemon does scale at 10^18. The chain-wide
 * supply figure is the outlier, and it needs its own constant.
 */
const NATIVE_SUPPLY_DECIMALS = 5;

type props = {
  tokens: TokenInfo[];
  /** Swap the row action from View to Manage. */
  showManage?: boolean;
  /**
   * Optional per-row navigation hook. Called before the View
   * link navigates. Not called for the Manage action, which
   * opens a modal instead of navigating.
   */
  onNavigate?: () => void;
};

function TokensTable({ tokens, showManage = false, onNavigate }: props) {
  //  Which token's manage modal is open, if any. `null` means
  //  no modal is showing. The id is a `bigint` so it matches
  //  the type the modal expects; the modal resolves the token
  //  record itself from the id.
  const [managingId, setManagingId] = useState<bigint | null>(null);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Image</TableHead>
            <TableHead>Token</TableHead>
            <TableHead className="text-right">Supply</TableHead>
            <TableHead>Creator</TableHead>
            <TableHead className="text-right">Decimals</TableHead>
            <TableHead className="text-right">Royalty</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tokens.map((t) => {
            const metadata = useTokenMetadata(BigInt(t.id));

            return (
              (
                <TokenRow
                  key={t.id}
                  token={t}
                  showManage={showManage}
                  onNavigate={onNavigate}
                  onManage={() => setManagingId(BigInt(t.id))}
                  metadata={metadata.data}
                />
              ))
          })}
        </TableBody>
      </Table>

      {/*
        One modal, reused for whichever token the user clicked
        Manage on. It renders outside the table so the dialog
        isn't clipped by the table's overflow and so the row
        unmounting doesn't tear down the modal mid-open.
      */}
      <ManageTokenModal
        tokenId={managingId}
        open={managingId !== null}
        onOpenChange={(next) => {
          if (!next) setManagingId(null);
        }}
      />
    </>
  );
}

// ================================================================
// Row
// ================================================================

function TokenRow({
  token: t,
  showManage,
  onNavigate,
  onManage,
  metadata
}: {
  token: TokenInfo;
  showManage: boolean;
  onNavigate?: () => void;
  onManage: () => void;
  metadata: TokenMetadata | null;
}) {
  const supply = useTokenSupply(BigInt(t.id));
  const decimals = effectiveDecimals(t);

  return (
    <TableRow>
      <TableCell>
        {metadata ? <img src={metadata.image} className="size-6" /> : "No metadata."}
      </TableCell>

      <TableCell>
        <Link
          href={`/search/tokens/${t.id}`}
          className="font-medium hover:underline"
          onClick={onNavigate}
        >
          {t.name}
        </Link>

        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span>
            {t.symbol} · #{t.id}
          </span>

          {metadata?.tags && (
            metadata.tags.map((tag, index) => (
              <span key={index} className="rounded-full border px-1.5 py-0.5 text-[10px] leading-none">
                {tag}
              </span>
            ))
          )}
        </div>
      </TableCell>

      <TableCell className="text-right tabular-nums">
        <SupplyCell
          token={t}
          decimals={decimals}
          supplyData={supply.data}
          loading={supply.loading}
        />
      </TableCell>

      <TableCell>
        {t.creator ? (
          <span className="font-mono text-xs text-muted-foreground">
            {shortAddress(t.creator)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell className="text-right tabular-nums">{decimals}</TableCell>

      <TableCell className="text-right tabular-nums">
        {t.royalty_bps > 0
          ? `${(t.royalty_bps / 100).toFixed(2)}%`
          : "—"}
      </TableCell>

      <TableCell className="text-right">
        {showManage ? (
          //  Manage opens a modal. It doesn't navigate, so it's a
          //  <button>, not a <Link>. This also avoids the
          //  Button-inside-Link shape that produces a Base UI
          //  warning for triggers.
          <Button
            variant="ghost"
            size="sm"
            onClick={onManage}
            type="button"
          >
            Manage
            <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        ) : (
          //  View navigates, so it stays a <Link>.
          <Link href={`/search/tokens/${t.id}`} onClick={onNavigate}>
            <Button variant="ghost" size="sm" type="button">
              View
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
      </TableCell>
    </TableRow>
  );
}

// ================================================================
// Supply cell
// ================================================================

/**
 * The supply column. Two pieces of information:
 *
 *   - The current tracked supply, from getTokenSupply.
 *   - The max supply, as a denominator, if the token has a cap.
 *
 * Both figures are formatted with the token's effective
 * decimals — NATIVE_SUPPLY_DECIMALS for the native token, the
 * record's value otherwise.
 */
function SupplyCell({
  token,
  decimals,
  supplyData,
  loading,
}: {
  token: TokenInfo;
  decimals: number;
  supplyData: { supply: string } | null;
  loading: boolean;
}) {
  const capped = token.max_supply !== "0x0";
  const max = capped ? BigInt(token.max_supply) : null;

  if (loading && !supplyData) {
    return (
      <span className="text-muted-foreground">
        {capped && max !== null ? (
          <>… / {formatSupply(max, decimals)}</>
        ) : (
          "…"
        )}
      </span>
    );
  }

  if (!supplyData) {
    return <span className="text-muted-foreground">—</span>;
  }

  const current = BigInt(supplyData.supply);

  if (!capped || max === null) {
    return <span>{formatSupply(current, decimals)}</span>;
  }

  return (
    <span>
      {formatSupply(current, decimals)}
      <span className="text-muted-foreground">
        {" / "}
        {formatSupply(max, decimals)}
      </span>
    </span>
  );
}

// ================================================================
// Helpers
// ================================================================

function formatSupply(amount: bigint, decimals: number): string {
  const s = formatTokenAmount(amount, decimals);
  const [whole, frac] = s.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac ? `${grouped}.${frac}` : grouped;
}

function effectiveDecimals(token: TokenInfo): number {
  if (token.is_native || BigInt(token.id) === 0n) {
    return NATIVE_SUPPLY_DECIMALS;
  }
  return token.decimals;
}

export default TokensTable;