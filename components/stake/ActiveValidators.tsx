
import { ArrowUpRight, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import Link from "next/link";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { bigIntToHex, formatClrty, formatCount, hexToBigInt } from "@claritychain/rpc";
import { GlassCard } from "../GlassCard";
import { GlassButton } from "../GlassButton";


function ActiveValidators({
  validators,
  loading,
}: {
  validators: {
    id: string;
    reward_address: string;
    stake: string;
    is_active: boolean;
    is_offline: boolean;
    uptime_score: number;
    total_blocks_produced: string;
  }[];
  loading: boolean;
}) {
  return (
    <GlassCard>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <Trophy className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle className="text-lg">Active validators</CardTitle>
            <CardDescription>
              Validators currently in the active set.
            </CardDescription>
          </div>
        </div>
        <Link href="/validators">
          <GlassButton variant="solid" className="opacity-75 hover:opacity-100 duration-150 transition-all">
            View all <ArrowUpRight className="ml-1 h-4 w-4" />
          </GlassButton>
        </Link>
      </CardHeader>
      <CardContent className="mt-2">
        {loading && validators.length === 0 && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {!loading && validators.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No active validators. This should never happen on a running
            chain; if you see it, the node is likely unreachable.
          </p>
        )}
        {validators.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Validator</TableHead>
                <TableHead className="text-right">Stake</TableHead>
                <TableHead className="text-right">Blocks</TableHead>
                <TableHead className="text-right">Uptime</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validators.map((v) => {
                const id = hexToBigInt(v.id);
                const stake = hexToBigInt(v.stake);
                const blocks = hexToBigInt(v.total_blocks_produced);
                return (
                  <TableRow key={v.id}>
                    <TableCell>
                      <Link
                        href={`/validators/${v.id}`}
                        className="font-mono text-xs hover:underline"
                      >
                        #{id.toString()}
                      </Link>
                      {v.is_offline && (
                        <span className="ml-2 text-xs text-yellow-600">
                          offline
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatClrty(bigIntToHex(stake))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCount(blocks.toString())}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(v.uptime_score / 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </GlassCard>
  );
}

export default ActiveValidators;