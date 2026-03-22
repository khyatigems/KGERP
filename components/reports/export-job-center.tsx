"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type ExportJob = {
  id: string;
  reportType: string;
  format: string;
  dateFrom: string | null;
  dateTo: string | null;
  status: string;
  requestedBy: string | null;
  createdAt: string;
  updatedAt: string;
  downloadUrl: string | null;
  errorMessage: string | null;
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  QUEUED: "secondary",
  PROCESSING: "outline",
  COMPLETED: "default",
  FAILED: "destructive",
};

export function ExportJobCenter() {
  const [reportType, setReportType] = useState("inventory");
  const [format, setFormat] = useState("csv");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [historyScope, setHistoryScope] = useState<"mine" | "all">("mine");
  const [historyRange, setHistoryRange] = useState<"7" | "30" | "all">("7");

  const fetchJobs = useCallback(async () => {
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      params.set("scope", historyScope);
      if (historyRange === "all") {
        params.set("allTime", "1");
      } else {
        params.set("days", historyRange);
      }
      const res = await fetch(`/api/reports/export-jobs?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { jobs: ExportJob[] };
      setJobs(json.jobs || []);
    } finally {
      setRefreshing(false);
    }
  }, [historyRange, historyScope]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    const hasActive = jobs.some((job) => job.status === "QUEUED" || job.status === "PROCESSING");
    if (!hasActive) return;
    const timer = setInterval(() => {
      fetchJobs();
    }, 8000);
    return () => clearInterval(timer);
  }, [fetchJobs, jobs]);

  const canGenerate = useMemo(() => !!reportType && !!format, [reportType, format]);

  const timeAgo = (iso: string) => {
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return "";
    const diffMs = Date.now() - t;
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes <= 0) return `${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/reports/export-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType,
          format,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          filters: {
            source: "reports-dashboard-export-center",
          },
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        setSubmitError(payload.error || "Failed to queue export job");
        return;
      }
      await fetchJobs();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Export Job Center</CardTitle>
        <CardDescription>Create asynchronous export jobs and track status history.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-5">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger><SelectValue placeholder="Report Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="inventory">Inventory</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="financial">Financial</SelectItem>
              <SelectItem value="vendor">Vendor</SelectItem>
              <SelectItem value="operations">Operations</SelectItem>
              <SelectItem value="inventory-aging">Inventory Aging</SelectItem>
              <SelectItem value="capital-rotation">Capital Rotation</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger><SelectValue placeholder="Format" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="xlsx">Excel</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={!canGenerate || loading}>
            {loading ? "Queueing..." : "Queue Export Job"}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Recent Jobs</h3>
          <div className="flex items-center gap-2">
            <Select value={historyScope} onValueChange={(v) => setHistoryScope(v as "mine" | "all")}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Scope" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mine">My jobs</SelectItem>
                <SelectItem value="all">All users</SelectItem>
              </SelectContent>
            </Select>
            <Select value={historyRange} onValueChange={(v) => setHistoryRange(v as "7" | "30" | "all")}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Range" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchJobs} disabled={refreshing}>
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
        {submitError && <p className="text-sm text-destructive">{submitError}</p>}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Created</TableHead>
              <TableHead>Report</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Output</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell>
                  <div className="text-sm">{new Date(job.createdAt).toLocaleString()}</div>
                  {(job.status === "QUEUED" || job.status === "PROCESSING") && (
                    <div className="text-xs text-muted-foreground">
                      {job.status === "QUEUED" ? `Queued for ${timeAgo(job.createdAt)}` : `Processing for ${timeAgo(job.updatedAt || job.createdAt)}`}
                    </div>
                  )}
                </TableCell>
                <TableCell>{job.reportType}</TableCell>
                <TableCell>{job.format}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[job.status] || "outline"}>{job.status}</Badge>
                </TableCell>
                <TableCell>{job.requestedBy || "-"}</TableCell>
                <TableCell>
                  {job.downloadUrl ? (
                    <a className="text-primary underline" href={job.downloadUrl} target="_blank" rel="noreferrer">Download</a>
                  ) : (
                    <span className="text-muted-foreground">{job.errorMessage || "Not ready"}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {jobs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">No export jobs yet</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
