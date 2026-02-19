"use client";

import { useCallback, useState } from "react";
import { getLabelJobs, getJobReprintItems, updateLabelJobStatus } from "@/app/(dashboard)/labels/actions";
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
  user: Pick<User, "name" | "email"> | null;
  items: LabelPrintJobItem[];
}

export function LabelHistory({ initialJobs = [] }: { initialJobs?: LabelJobWithRelations[] }) {
    const [jobs, setJobs] = useState<LabelJobWithRelations[]>(initialJobs);
    const [loading, setLoading] = useState(false);

    const loadJobs = useCallback(async () => {
        setLoading(true);
        const data = await getLabelJobs();
        setJobs(data);
        setLoading(false);
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
                            <TableHead>Status</TableHead>
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
                                const formatConfig = job.printFormat ? JSON.parse(job.printFormat) : { pageSize: "Unknown" };
                                // Check validation of items
                                const invalidItems = job.items.filter((i) => i.priceWithChecksum && !validatePrice(i.priceWithChecksum));
                                const isValid = invalidItems.length === 0;

                                return (
                                    <TableRow key={job.id}>
                                        <TableCell>{format(new Date(job.createdAt), "PP p")}</TableCell>
                                        <TableCell>{job.user?.name || "Unknown"}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {job.totalItems} items
                                                <JobDetailsDialog job={job} />
                                            </div>
                                        </TableCell>
                                        <TableCell>{formatConfig.pageSize}</TableCell>
                                        <TableCell>{job.status}</TableCell>
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
    const [qcBarcode, setQcBarcode] = useState(false);
    const [qcPrint, setQcPrint] = useState(false);
    const [qcData, setQcData] = useState(false);
    const [updating, setUpdating] = useState(false);
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6"><Info className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Job Details - {format(new Date(job.createdAt), "PP p")}</DialogTitle>
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
                            const isValid = validatePrice(item.priceWithChecksum || "");
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
                <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={qcBarcode} onChange={(e) => setQcBarcode(e.target.checked)} />
                        <span className="text-sm">Barcode verified</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={qcPrint} onChange={(e) => setQcPrint(e.target.checked)} />
                        <span className="text-sm">Print quality OK</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={qcData} onChange={(e) => setQcData(e.target.checked)} />
                        <span className="text-sm">Data matches SKU</span>
                    </div>
                </div>
                <div className="flex justify-end mt-4">
                    <Button 
                        size="sm" 
                        disabled={updating || !(qcBarcode && qcPrint && qcData)} 
                        onClick={async () => {
                            setUpdating(true);
                            await updateLabelJobStatus(job.id, "COMPLETED");
                            setUpdating(false);
                        }}
                    >
                        Mark Completed
                    </Button>
                </div>
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
