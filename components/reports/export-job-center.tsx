"use client";

import { useEffect, useMemo, useState } from "react";
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

  const fetchJobs = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/reports/export-jobs?limit=20", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { jobs: ExportJob[] };
      setJobs(json.jobs || []);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    const hasActive = jobs.some((job) => job.status === "QUEUED" || job.status === "PROCESSING");
    if (!hasActive) return;
    const timer = setInterval(() => {
      fetchJobs();
    }, 8000);
    return () => clearInterval(timer);
  }, [jobs]);

  const canGenerate = useMemo(() => !!reportType && !!format, [reportType, format]);

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
          <Button variant="outline" size="sm" onClick={fetchJobs} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
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
                <TableCell>{new Date(job.createdAt).toLocaleString()}</TableCell>
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
