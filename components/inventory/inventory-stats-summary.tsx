import { Boxes, IndianRupee, FileCheck, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { InventoryStatsResponse } from "./inventory-stats";

export function InventoryStatsSummary({ data, loading, refreshing }: { data?: InventoryStatsResponse; loading?: boolean; refreshing?: boolean }) {
  const counts = new Map(data?.overallByStatus?.map((row) => [row.status, row.items]));
  const total = data?.totalItems || 0;
  const overall = data?.overallTotalItems ?? total;
  const images = data?.withImagesCount || 0;
  const certificates = data?.withCertificateCount || 0;
  const cards = "inventory-stat-card";
  return <section className="inventory-summary-grid" aria-label="Inventory summary" aria-busy={loading || refreshing}>
    <div className={cards}>
      <div className="inventory-stat-label"><span>Total items</span><Boxes size={15} /></div>
      <div className="inventory-stat-value">{data ? overall.toLocaleString() : "—"}</div>
      <div className="inventory-stock-counts"><span>In stock <b>{counts.get("IN_STOCK") || 0}</b></span><span>Sold <b>{counts.get("SOLD") || 0}</b></span><span>Reserved <b>{counts.get("RESERVED") || 0}</b></span><span>Memo <b>{counts.get("MEMO") || 0}</b></span></div>
      {data && overall !== total && <p className="inventory-stat-note">{total} match current filters</p>}
      {data && <details className="inventory-stat-more"><summary>Top category & gem</summary><p>{data.byCategory?.[0]?.category || "—"} · {data.byGemType?.[0]?.gemType || "—"}</p></details>}
    </div>
    <div className={cards}>
      <div className="inventory-stat-label"><span>Sell value</span><IndianRupee size={15} /></div>
      <div className="inventory-stat-value inventory-money">{data ? formatCurrency(data.totalSell) : "—"}</div>
      <p className="inventory-stat-note">For current results</p>
      <div className="inventory-stat-note mt-2">Average <strong>{data ? formatCurrency(data.avgSell) : "—"}</strong><br />Highest <strong>{data ? formatCurrency(data.maxSell) : "—"}</strong></div>
    </div>
    <div className={cards}>
      <div className="inventory-stat-label"><span>Item readiness</span><FileCheck size={15} /></div>
      {[{ name: "Images", count: images }, { name: "Certificates", count: certificates }].map((metric) => {
        const percent = total ? Math.round(metric.count / total * 100) : 0;
        return <div key={metric.name} className="inventory-readiness"><div><span>{metric.name}</span><strong>{data ? `${metric.count}/${total}` : "—"}</strong></div><div className="inventory-mini-track"><span style={{ width: `${Math.min(100, percent)}%` }} /></div><small>{data ? `${percent}% · ${Math.max(0, total - metric.count)} missing` : "Loading…"}</small></div>;
      })}
    </div>
    <div className={cards}>
      <div className="inventory-stat-label"><span>Stock aging</span><Clock size={15} /></div>
      <p className="inventory-stat-note mb-2">In-stock items only</p>
      <div className="inventory-aging"><span><i className="bg-emerald-500" />Fresh <small>0–30 days</small><b>{data?.aging?.fresh ?? "—"}</b></span><span><i className="bg-amber-500" />Slow <small>31–90 days</small><b>{data?.aging?.slow ?? "—"}</b></span><span><i className="bg-rose-500" />Aged <small>90+ days</small><b>{data?.aging?.dead ?? "—"}</b></span></div>
    </div>
  </section>;
}
