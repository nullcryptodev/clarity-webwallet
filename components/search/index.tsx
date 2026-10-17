"use client";

import { FC, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SearchIcon } from "lucide-react";

import { rpc } from "@/lib/rpc";
import { GlassInput } from "../GlassInput";
import { GlassButton } from "../GlassButton";
import Link from "next/link";

// The explorer accepts five shapes of input:
//
//  Block height        a decimal number, e.g. 69
//  Block or tx hash    "0x" + 64 hex chars
//  Address             bech32m, starting with clrty / tclrty / rclrty
//  Token ID            a decimal number (same shape as block height)
//  Validator ID        a decimal number (same shape as block height)
//
// Numbers and hashes are ambiguous:
//
//  A number could be a block height, a token ID, or a validator ID.
//  A 32-byte hash could be a block hash or a transaction hash.
//
// We disambiguate by probing the node — see resolveNumber and
// resolveHash below. bech32m addresses are unambiguous; they always
// route to /address/.

type Classification =
  | { kind: "hash"; value: string }
  | { kind: "number"; value: string }
  | { kind: "address"; value: string }
  | { kind: "unknown" };

function classify(input: string): Classification {
  const q = input.trim();
  if (!q) return { kind: "unknown" };

  // Hex hash: "0x" + 64 hex chars.
  if (/^0x[a-fA-F0-9]{64}$/.test(q)) {
    return { kind: "hash", value: q.toLowerCase() };
  }

  // Bech32m address. Matches the three network HRPs.
  if (/^(clrty|tclrty|rclrty)1[02-9ac-hj-np-z]+$/i.test(q)) {
    return { kind: "address", value: q.toLowerCase() };
  }

  // Decimal number.
  if (/^\d+$/.test(q)) {
    return { kind: "number", value: q };
  }

  // "0x"-prefixed hex integer, but shorter than a full hash.
  if (/^0x[a-fA-F0-9]{1,63}$/.test(q)) {
    return { kind: "number", value: q };
  }

  return { kind: "unknown" };
}

const Search: FC = () => {
  const [searchInputText, setSearchInputText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleSubmit(raw: string) {
    const query = raw.trim();
    if (!query) return;

    setError(null);
    const classified = classify(query);

    switch (classified.kind) {
      case "address": {
        // Bech32m addresses are unambiguous. Route directly; the
        // address page fetches the account and returns "not found"
        // if it has never been touched.
        router.push(`/search/address/${classified.value}`);
        return;
      }

      case "number": {
        // Numbers are ambiguous. Probe the node: block first (the
        // most common case), then validator, then token.
        setBusy(true);
        try {
          const target = await resolveNumber(classified.value);
          if (target) {
            router.push(target);
          } else {
            setError(`No block, validator, or token with ID ${query}`);
          }
        } finally {
          setBusy(false);
        }
        return;
      }

      case "hash": {
        // Hashes are ambiguous too. Probe both; transaction wins
        // because a transaction is the more likely intent when a
        // user pastes a hash.
        setBusy(true);
        try {
          const target = await resolveHash(classified.value);
          if (target) {
            router.push(target);
          } else {
            setError(`No block or transaction with hash ${query}`);
          }
        } finally {
          setBusy(false);
        }
        return;
      }

      case "unknown": {
        setError(
          "Enter a block height, a block or transaction hash, a token ID, or an address.",
        );
        return;
      }
    }
  }

  const searchAll = [
    {
      name: "Addresses",
      url: "/search/address"
    },
    {
      name: "Tokens",
      url: "/search/tokens"
    },
    {
      name: "Blocks",
      url: "/search/address"
    },
    {
      name: "Transactions",
      url: "/search/address"
    },
  ]

  return (
    <div>
      <h1 className="font-medium text-2xl text-center">Search Clarity</h1>

      <div className="flex items-center gap-2 lg:w-3/4 lg:mx-auto">
        <p className="text-sm text-muted-foreground opacity-90">
          View All:
        </p>
        {searchAll.map((item, index) => (
          <Link href={item.url} key={index}>
            <GlassButton size="sm" variant="solid" className="opacity-75 hover:opacity-100 transition-all">
              {item.name}
            </GlassButton>
          </Link>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmit(searchInputText);
        }}
        className="p-4 flex gap-2"
      >
        <div className="flex w-full lg:w-3/4 lg:mx-auto items-stretch gap-2">
          <GlassInput
            value={searchInputText}
            onChange={(e) => {
              setSearchInputText(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Search a block height, transaction hash, address, or token id"
            aria-label="Search"
            className="h-12"
            disabled={busy}
          />

          <Button
            type="submit"
            className="size-12"
            disabled={busy || searchInputText.trim().length === 0}
            variant="outline"
          >
            <SearchIcon />
          </Button>
        </div>
      </form>

      {error && (
        <p className="px-4 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};

// Resolve a decimal (or short hex) number to a route.
//
//  1. Block by height. The most common case.
//  2. Validator by ID.
//  3. Token by ID.
//
// Returns the path or null if none match. Each probe is a cheap
// point lookup; the point of asking the node rather than guessing is
// that the same number can be a block, a validator, and a token, and
// we want the answer that actually exists.

async function resolveNumber(input: string): Promise<string | null> {
  // Normalize to the same hex shape the RPC accepts. Decimal
  // "69" and hex "0x45" are both valid; the node accepts either.
  const asHex = input.startsWith("0x")
    ? input
    : "0x" + BigInt(input).toString(16);

  // 1. Block.
  try {
    await rpc.getBlockHeaderByNumber(asHex);
    return `/search/blocks/${BigInt(input).toString()}`;
  } catch {
    // not a block
  }

  // 2. Validator.
  try {
    await rpc.getValidator(asHex);
    return `/validators/${asHex}`;
  } catch {
    // not a validator
  }

  // 3. Token.
  try {
    await rpc.getTokenInfo(asHex);
    return `/search/tokens/${asHex}`;
  } catch {
    // not a token
  }

  return null;
}

// Resolve a 32-byte hash to a route.
//
//  1. Try transaction. If it hits, route to /txs/[hash].
//  2. Try block. If it hits, route to /blocks/[height] — we look
//     up the block by hash, then navigate to the canonical
//     height-based URL.

async function resolveHash(hash: string): Promise<string | null> {
  // 1. Transaction.
  try {
    await rpc.getTransactionByHash(hash);
    return `/txs/${hash}`;
  } catch {
    // not a tx
  }

  // 2. Block. Fetch it so we can navigate to the height URL rather
  //   than needing a separate /blocks/hash/[hash] route.
  try {
    const block = await rpc.getBlockByHash(hash);
    return `/search/blocks/${BigInt(block.height).toString()}`;
  } catch {
    // not a block
  }

  return null;
}

export default Search;