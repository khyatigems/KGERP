"use client";

import { useEffect, useState } from "react";
import { getLabelJobs, getJobReprintItems } from "@/app/(dashboard)/labels/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Printer, RefreshCw, CheckCircle, XCircle, Info } from "lucide-react";
import { format } from "date-fns";
import { LabelPrintDialog } from "@/components/inventory/label-print-dialog";
import { validatePrice } from "@/lib/price-encoder";
import { LabelPrintJob, LabelPrintJobItem, User } from "@prisma/client";
import { LabelItem } from "@/lib/label-generator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface LabelJobWithRelations extends LabelPrintJob {
  user: User | null;
  items: LabelPrintJobItem[];
}

export function LabelHistory() {
    const [jobs, setJobs] = useState<LabelJobWithRelations[]>([]);
    const [loading, setLoading] = useState(true);

    const loadJobs = async () => {
        const data = await getLabelJobs();
        setJobs(data);
        setLoading(false);
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadJobs();
    }, []);

    return (
        <div className="space-y-4">
             <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={loadJobs}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
            </div>
            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Format</TableHead>
                            <TableHead>Validation</TableHead>
                            <TableHead>Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
                        ) : jobs.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center">No history found</TableCell></TableRow>
                        ) : (
                            jobs.map(job => {
                                const formatConfig = JSON.parse(job.printFormat);
                                // Check validation of items
                                const invalidItems = job.items.filter((i) => i.priceWithChecksum && !validatePrice(i.priceWithChecksum));
                                const isValid = invalidItems.length === 0;

                                return (
                                    <TableRow key={job.id}>
                                        <TableCell>{format(new Date(job.timestamp), "PP p")}</TableCell>
                                        <TableCell>{job.user?.name || "Unknown"}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {job.totalItems} items
                                                <JobDetailsDialog job={job} />
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatConfig.pageSize}</TableCell>
                                        <TableCell>
                                            {isValid ? (
                                                <div className="flex items-center text-green-600">
                                                    <CheckCircle className="w-4 h-4 mr-1" /> Valid
                                                </div>
                                            ) : (
                                                <div className="flex items-center text-red-600">
                                                    <XCircle className="w-4 h-4 mr-1" /> {invalidItems.length} Invalid
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <ReprintButton job={job} />
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function JobDetailsDialog({ job }: { job: LabelJobWithRelations }) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6"><Info className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Job Details - {format(new Date(job.timestamp), "PP p")}</DialogTitle>
                </DialogHeader>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Checksum</TableHead>
                            <TableHead>Encoded</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {job.items.map((item) => {
                            const isValid = validatePrice(item.priceWithChecksum);
                            return (
                                <TableRow key={item.id}>
                                    <TableCell>{item.sku}</TableCell>
                                    <TableCell>{item.sellingPrice}</TableCell>
                                    <TableCell>{item.checksumDigit}</TableCell>
                                    <TableCell className="font-mono">{item.priceWithChecksum}</TableCell>
                                    <TableCell>
                                        {isValid ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </DialogContent>
        </Dialog>
    )
}

function ReprintButton({ job }: { job: LabelJobWithRelations }) {
    const [items, setItems] = useState<LabelItem[]>([]);
    const [loading, setLoading] = useState(false);

    const handleLoad = async () => {
        setLoading(true);
        const data = await getJobReprintItems(job.id);
        setItems(data as unknown as LabelItem[]);
        setLoading(false);
    };

    if (items.length > 0) {
        return (
            <LabelPrintDialog 
                items={items}
                trigger={
                    <Button variant="ghost" size="sm">
                        <Printer className="mr-2 h-4 w-4" /> Reprint
                    </Button>
                }
            />
        );
    }

    return (
        <Button variant="ghost" size="sm" onClick={handleLoad} disabled={loading}>
            {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            {loading ? " Loading..." : " Reprint"}
        </Button>
    );
}
