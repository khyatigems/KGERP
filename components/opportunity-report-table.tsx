"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { MarketplacePlatform, MarketplacePortfolioRow } from "@/lib/marketplace-control-center";
import type { PricingAnalysis } from "@/lib/pricing/types";
import { PRICING_STATUS_COLORS, PRICING_STATUS_LABELS } from "@/lib/pricing/constants";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type OpportunityReportRowPayload = {
  row: MarketplacePortfolioRow;
  analysis: PricingAnalysis | null;
  perMp: Array<{ platform: MarketplacePlatform; analysis: PricingAnalysis; listedPriceInr: number }>;
};

interface OpportunityReportTableProps {
  rows: OpportunityReportRowPayload[];
  pricingEnabled: boolean;
}

function formatDateLabel(raw: string | null | undefined): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function OpportunityReportTable({ rows, pricingEnabled }: OpportunityReportTableProps) {
  const [openSku, setOpenSku] = useState<string | null>(null);
  const colSpan = pricingEnabled ? 10 : 6;

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {pricingEnabled ? <TableHead className="w-8"></TableHead> : null}
            <TableHead>SKU</TableHead>
            <TableHead>Product Name</TableHead>
            {pricingEnabled ? (
              <>
                <TableHead className="text-right">MRP</TableHead>
                <TableHead className="text-right">MSP</TableHead>
                <TableHead className="text-right">Diff vs MSP</TableHead>
                <TableHead className="text-right">Expected Profit</TableHead>
                <TableHead className="text-right">Profit %</TableHead>
                <TableHead className="text-right">Margin %</TableHead>
                <TableHead>Pricing Status</TableHead>
              </>
            ) : (
              <>
                <TableHead>Current Marketplaces</TableHead>
                <TableHead>Missing Marketplaces</TableHead>
                <TableHead>Opportunity</TableHead>
                <TableHead>Ready</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colSpan} className="text-center h-24 text-muted-foreground">
                No opportunities found
              </TableCell>
            </TableRow>
          ) : (
            rows.map(({ row, analysis, perMp }) => {
              const hasDetail = pricingEnabled && perMp.length > 0;
              const open = openSku === row.inventoryId;
              return (
                <DetailRowGroup
                  key={row.inventoryId}
                  colSpan={colSpan}
                  hasToggle={pricingEnabled}
                  open={open}
                  hasDetail={hasDetail}
                  onToggle={() => setOpenSku(open ? null : row.inventoryId)}
                  mainCells={renderMainCells(row, analysis, pricingEnabled)}
                  detail={hasDetail ? renderPerMarketplaceDetail(perMp) : null}
                />
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function renderMainCells(
  row: MarketplacePortfolioRow,
  analysis: PricingAnalysis | null,
  pricingEnabled: boolean
) {
  return (
    <>
      <TableCell className="font-medium">{row.sku}</TableCell>
      <TableCell>
        <Link href={`/inventory/${row.inventoryId}`} className="hover:underline">
          {row.productName}
        </Link>
      </TableCell>
      {pricingEnabled ? (
        <>
          <TableCell className="text-right font-medium">{analysis ? formatCurrency(analysis.mrp) : "—"}</TableCell>
          <TableCell className="text-right font-medium">{analysis ? formatCurrency(analysis.msp) : "—"}</TableCell>
          <TableCell className={`text-right ${analysis && analysis.diffVsMsp < 0 ? "text-red-600" : ""}`}>
            {analysis ? formatCurrency(analysis.diffVsMsp) : "—"}
          </TableCell>
          <TableCell className={`text-right font-medium ${analysis && analysis.expectedProfit < 0 ? "text-red-600" : "text-emerald-600"}`}>
            {analysis ? formatCurrency(analysis.expectedProfit) : "—"}
          </TableCell>
          <TableCell className="text-right">{analysis ? `${analysis.profitPct.toFixed(1)}%` : "—"}</TableCell>
          <TableCell className="text-right">{analysis ? `${analysis.marginPct.toFixed(1)}%` : "—"}</TableCell>
          <TableCell>
            {analysis ? (
              <Badge className={PRICING_STATUS_COLORS[analysis.status]}>{PRICING_STATUS_LABELS[analysis.status]}</Badge>
            ) : (
              "—"
            )}
          </TableCell>
        </>
      ) : (
        <>
          <TableCell>
            {row.platforms.length === 0 ? "None" : (
              <div className="flex flex-wrap gap-1">
                {row.platforms.map((p) => (
                  <Badge key={p} variant="default" className="text-[10px]">
                    {p}
                    {row.lastListedDates?.[p] ? ` ${formatDateLabel(row.lastListedDates[p])}` : ""}
                  </Badge>
                ))}
              </div>
            )}
          </TableCell>
          <TableCell>
            {row.missingPlatforms.length === 0 ? "None" : (
              <div className="flex flex-wrap gap-1">
                {row.missingPlatforms.map((p) => (
                  <a key={p} href={`/inventory/${row.inventoryId}`} target="_blank" rel="noopener noreferrer">
                    <Badge variant="outline" className="cursor-pointer hover:bg-accent text-[10px]">{p}</Badge>
                  </a>
                ))}
              </div>
            )}
          </TableCell>
          <TableCell>
            <Badge variant={row.opportunityScore >= 2 ? "destructive" : "secondary"}>
              {row.opportunityScore} Missing
            </Badge>
          </TableCell>
          <TableCell>
            {row.platforms.length > 0 ? (
              <Badge variant="default" className="bg-emerald-500 text-[10px]">Listed</Badge>
            ) : row.readyToList ? (
              <Badge variant="default" className="text-[10px]">✅ Ready</Badge>
            ) : (
              <Badge variant="outline" className="border-amber-500 text-amber-600 text-[10px]">⚠️ Needs Prep</Badge>
            )}
          </TableCell>
        </>
      )}
    </>
  );
}

function renderPerMarketplaceDetail(
  perMp: Array<{ platform: MarketplacePlatform; analysis: PricingAnalysis; listedPriceInr: number }>
) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
        Per-marketplace analysis (actual listed price)
      </div>
      <div className="grid grid-cols-6 gap-2 text-xs">
        <div className="font-medium">Marketplace</div>
        <div className="text-right font-medium">Listed (INR)</div>
        <div className="text-right font-medium">Fees</div>
        <div className="text-right font-medium">MSP</div>
        <div className="text-right font-medium">Profit</div>
        <div className="font-medium">Status</div>
        {perMp.map(({ platform, analysis: a, listedPriceInr }) => (
          <FragmentRow
            key={platform}
            cells={
              <>
                <span className="font-medium">{platform}</span>
                <span className="text-right">{formatCurrency(listedPriceInr)}</span>
                <span className="text-right text-muted-foreground">{formatCurrency(a.marketplaceCosts)}</span>
                <span className="text-right">{formatCurrency(a.msp)}</span>
                <span className={`text-right ${a.expectedProfit < 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {formatCurrency(a.expectedProfit)}
                </span>
                <span>
                  <Badge className={PRICING_STATUS_COLORS[a.status]}>{PRICING_STATUS_LABELS[a.status]}</Badge>
                </span>
              </>
            }
          />
        ))}
      </div>
    </div>
  );
}

function FragmentRow({ cells }: { cells: React.ReactNode }) {
  return <>{cells}</>;
}

function DetailRowGroup({
  colSpan,
  hasToggle,
  open,
  hasDetail,
  onToggle,
  mainCells,
  detail,
}: {
  colSpan: number;
  hasToggle: boolean;
  open: boolean;
  hasDetail: boolean;
  onToggle: () => void;
  mainCells: React.ReactNode;
  detail: React.ReactNode | null;
}) {
  return (
    <>
      <TableRow className="hover:bg-muted/50">
        {hasToggle ? (
          <TableCell className="w-8">
            {hasDetail ? (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={onToggle}
                aria-label="Toggle marketplace detail"
              >
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : null}
          </TableCell>
        ) : null}
        {mainCells}
      </TableRow>
      {hasDetail && open && detail ? (
        <TableRow>
          <TableCell colSpan={colSpan} className="bg-muted/30 p-3">
            {detail}
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}
