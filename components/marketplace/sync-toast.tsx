"use client";

import Image from "next/image";
import { ArrowDownToLine, Check, ChevronRight, Clock3, Package, RefreshCw, ShoppingBag, Store, TriangleAlert, X } from "lucide-react";
import { FeedbackIcon } from "@/components/ui/feedback-icon";
import { safeErrorMessage } from "@/lib/erp-feedback";
import { RetryMarketplaceSyncButton } from "./retry-sync-button";
import styles from "./sync-toast.module.css";

export type SyncJob = {
  id: string;
  status: string;
  syncType: string;
  progressStep: string;
  progressDetail: string | null;
  recordsScanned: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  errorDetails: string | null;
  updatedAt: string;
  marketplaceShop: { marketplace: string; name: string };
};

export function MarketplaceSyncToast({ jobs, onDismiss }: { jobs: SyncJob[]; onDismiss: () => void }) {
  const processing = jobs.some((job) => job.status === "PROCESSING");
  const active = processing || jobs.some((job) => job.status === "QUEUED");
  const failed = jobs.filter((job) => ["FAILED", "PARTIAL"].includes(job.status));
  const completed = jobs.filter((job) => !["QUEUED", "PROCESSING"].includes(job.status)).length;
  const totals = jobs.reduce((sum, job) => ({ scanned: sum.scanned + job.recordsScanned, created: sum.created + job.recordsCreated, updated: sum.updated + job.recordsUpdated }), { scanned: 0, created: 0, updated: 0 });
  const orders = jobs[0]?.syncType === "ORDERS";
  const ItemIcon = orders ? ShoppingBag : Package;
  const title = active ? (processing ? `Syncing your ${orders ? "orders" : "listings"}` : "Your sync is lined up") : failed.length ? "Sync needs attention" : "Everything is in sync";

  return (
    <section className={styles.card} data-state={active ? (processing ? "processing" : "queued") : failed.length ? "error" : "complete"} aria-label="Marketplace sync status">
      <div className={styles.header}>
        <div className={styles.statusIcon}>{active && !processing ? <Clock3 size={20} strokeWidth={2} absoluteStrokeWidth aria-hidden="true" /> : <FeedbackIcon state={active ? "loading" : failed.length ? "warning" : "success"} />}</div>
        <div className="min-w-0 flex-1">
          <p className={styles.eyebrow}>MARKETPLACE SYNC <span className={styles.liveDot} /> {active ? "LIVE" : "RESULT"}</p>
          <h2 className="mt-1 text-sm font-semibold tracking-tight" role="status">{title}</h2>
        </div>
        <button type="button" onClick={onDismiss} className={styles.close} aria-label="Dismiss sync notification" title="Dismiss notification"><X size={16} /></button>
      </div>

      <div className={styles.flow} aria-hidden="true">
        <div className={styles.endpoint}><Store size={20} /><span>Marketplaces</span></div>
        <div className={styles.track}>
          <div className={styles.trackLine} />
          {processing ? [0, 1, 2].map((index) => <span key={index} className={styles.parcel} style={{ animationDelay: `${index * -0.85}s` }}><ItemIcon size={14} /></span>) : <span className={styles.flowState}>{active ? <Clock3 size={16} /> : <FeedbackIcon state={failed.length ? "warning" : "success"} size={18} />}</span>}
        </div>
        <div className={`${styles.endpoint} ${styles.erp}`}><div className={styles.erpLogo}><Image src="/khyatigems-icon-white.png" alt="Khyati Gems" width={44} height={44} /></div><span>Khyati ERP</span></div>
      </div>
      <div className={styles.caption}>{processing ? `Bringing marketplace ${orders ? "orders" : "items"} into your ERP` : active ? "Waiting for the sync worker to start" : failed.length ? "Review the affected shops below" : `Your marketplace ${orders ? "orders" : "listings"} are up to date`}</div>

      <div className={styles.metrics}>
        <div><strong key={totals.scanned} className={styles.count}>{totals.scanned.toLocaleString()}</strong><span>Scanned</span></div>
        <div><strong>{totals.created.toLocaleString()}</strong><span>New records</span></div>
        <div><strong>{totals.updated.toLocaleString()}</strong><span>Updated</span></div>
      </div>
      <div className={styles.shops}>
        {jobs.map((job) => {
          const running = job.status === "PROCESSING";
          const queued = job.status === "QUEUED";
          const error = ["FAILED", "PARTIAL"].includes(job.status);
          const Icon = running ? RefreshCw : queued ? Clock3 : error ? TriangleAlert : Check;
          return <div key={job.id} className={styles.shop}>
            <span className={styles.marketplace} data-marketplace={job.marketplaceShop.marketplace}>{job.marketplaceShop.marketplace === "ETSY" ? "E" : job.marketplaceShop.marketplace === "EBAY" ? <Image src="/ebay-sync-icon.png" alt="eBay" width={24} height={24} className={styles.marketplaceLogo} /> : <Store size={16} />}</span>
            <div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold" title={job.marketplaceShop.name}>{job.marketplaceShop.name}</div><div className={styles.shopDetail} title={job.progressDetail || job.progressStep}>{job.progressDetail || job.progressStep}</div></div>
            <span className={styles.badge} data-status={job.status}><Icon size={11} className={running ? styles.spin : undefined} />{running ? "Syncing" : queued ? "Queued" : error ? "Review" : "Done"}</span>
          </div>;
        })}
      </div>
      <div className={styles.footer}>
        <span><ArrowDownToLine size={12} /> {completed} / {jobs.length} shops finished</span>
        <span>{orders ? "Orders" : "Listings"}</span>
      </div>
      <details className={styles.details}>
        <summary><ChevronRight size={13} /> Sync details {failed.length > 0 && <span className="text-amber-600 dark:text-amber-400">· {failed.length} need attention</span>}</summary>
        <div className="mt-3 space-y-2">
          {jobs.map((job) => <div key={job.id} className="rounded-lg bg-muted/50 p-2.5 text-xs leading-relaxed"><div className="font-semibold">{job.marketplaceShop.marketplace} · {job.marketplaceShop.name} · {job.status}</div><div>Scanned {job.recordsScanned} · Created {job.recordsCreated} · Updated {job.recordsUpdated} · Skipped {job.recordsSkipped} · Failed {job.recordsFailed}</div>{job.errorDetails && <div className="mt-1 whitespace-pre-wrap wrap-break-word text-destructive">{safeErrorMessage(job.errorDetails)}</div>}</div>)}
          {failed.length > 0 && <RetryMarketplaceSyncButton jobIds={failed.map((job) => job.id)} />}
        </div>
      </details>
    </section>
  );
}
