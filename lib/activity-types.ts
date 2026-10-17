// lib/activity-types.ts
//
// Shared types and constructor for the activity feed.
//
// ActivityEntry lives here rather than in the Activity component
// because both the component and the hooks that feed it need the
// type. When it lived in the component, hooks had to redeclare it
// and the two copies could drift — which they did, on the
// `direction` field.
//
// `toEntry` is the only constructor. Every path that produces an
// ActivityEntry goes through it, which is what guarantees the
// `direction` field is always set. An entry built by hand is an
// entry whose row will render as "related" for what should be a
// clear in/out.

import { hexToBigInt } from "@claritychain/rpc";

/**
 * A single row in the activity list.
 */
export interface ActivityEntry {
  type: string;
  txHash: string;
  blockHeight: number;
  from: string | null;
  to: string | null;
  /**
   * Which side of the transaction the viewer is on:
   *
   *   - `in`      the viewer is the recipient
   *   - `out`     the viewer is the sender
   *   - `self`    the viewer is both
   *   - `related` neither (the chain-wide feed, or a query the
   *               client can't classify)
   */
  direction: "in" | "out" | "self" | "related";
}

/**
 * The wire shape `toEntry` accepts. Kept structural rather than
 * importing `TxWithLocation` so callers can pass any object with
 * these fields.
 */
export interface WireTx {
  tx: {
    type: string;
    hash: string;
    from: string;
    to: string | null;
  };
  block_height: string;
}

/**
 * Convert a wire transaction into an ActivityEntry, classifying
 * the direction relative to the viewer's address.
 *
 * This is the *only* function that should build an
 * ActivityEntry. If a caller constructs one directly, the
 * direction field is either missing or guessed, and the row will
 * render as "related" for what should be a clear in/out.
 *
 * The classification normalises case before comparing, because
 * bech32m addresses are case-insensitive for comparison and the
 * RPC may return either case.
 *
 * Passing an empty viewer (as the chain-wide feed does) makes
 * every entry fall into `related`, which is correct: a
 * chain-wide feed has no viewer to be on a side of.
 *
 * `block_reward` transactions are classified as `in` when the
 * viewer is the recipient, which is how a validator sees its
 * per-block income in the feed.
 */
export function toEntry(viewer: string, t: WireTx): ActivityEntry {
  const from = t.tx.from ?? null;
  const to = t.tx.to ?? null;

  const viewerLower = viewer.toLowerCase();
  const fromLower = (from ?? "").toLowerCase();
  const toLower = (to ?? "").toLowerCase();

  const direction: ActivityEntry["direction"] =
    viewer.length === 0
      ? "related"
      : fromLower === viewerLower && toLower === viewerLower
        ? "self"
        : fromLower === viewerLower
          ? "out"
          : toLower === viewerLower
            ? "in"
            : "related";

  return {
    type: t.tx.type,
    txHash: t.tx.hash,
    blockHeight: Number(hexToBigInt(t.block_height)),
    from,
    to,
    direction,
  };
}