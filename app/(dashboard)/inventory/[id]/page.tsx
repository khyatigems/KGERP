import { prisma } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";
import { Activity, Pencil } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const item = await prisma.inventory.findUnique({ where: { id } });
    
    if (!item) return <div className="p-6">Inventory Item not found</div>;

    // Safety check for activityLog access
    let logs: any[] = [];
    try {
        if (prisma.activityLog) {
            logs = await prisma.activityLog.findMany({
                where: { entityType: "Inventory", entityId: id },
                orderBy: { timestamp: "desc" }
            });
        }
    } catch (error) {
        console.error("Failed to fetch activity logs for inventory:", error);
    }
    
    const lastEdit = logs.find(l => l.actionType === 'EDIT');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{item.itemName}</h1>
                    <div className="flex flex-col gap-1 mt-1">
                        <p className="text-sm text-muted-foreground">{item.sku} · {item.category}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>Created {formatDistanceToNow(item.createdAt, { addSuffix: true })} by {item.createdBy}</span>
                             {lastEdit && (
                                <span>Last edited {formatDistanceToNow(lastEdit.timestamp, { addSuffix: true })} by {lastEdit.userName}</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href={`/inventory/${id}/edit`}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/inventory">Back to Inventory</Link>
                    </Button>
                </div>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                 <div className="space-y-2 rounded-xl border bg-card p-4 text-card-foreground shadow">
                    <h2 className="text-sm font-medium text-muted-foreground">Basic Info</h2>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Type:</span> 
                            <span className="font-medium">{item.gemType}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Shape:</span> 
                            <span className="font-medium">{item.shape}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Weight:</span> 
                            <span className="font-medium">{item.weightValue} {item.weightUnit} ({item.weightRatti} Ratti)</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Dimensions:</span> 
                            <span className="font-medium">{item.dimensionsMm || "-"}</span>
                        </div>
                    </div>
                 </div>

                 <div className="space-y-2 rounded-xl border bg-card p-4 text-card-foreground shadow">
                    <h2 className="text-sm font-medium text-muted-foreground">Status & Pricing</h2>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Status:</span> 
                            <Badge variant="outline">{item.status}</Badge>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Location:</span> 
                            <span className="font-medium">{item.stockLocation || "-"}</span>
                        </div>
                        <div className="flex justify-between border-t pt-2 mt-2">
                             <span className="text-muted-foreground">Pricing Mode:</span>
                             <span className="font-medium">{item.pricingMode}</span>
                        </div>
                    </div>
                 </div>
                 
                 {item.notes && (
                    <div className="space-y-2 rounded-xl border bg-card p-4 text-card-foreground shadow md:col-span-2 lg:col-span-1">
                        <h2 className="text-sm font-medium text-muted-foreground">Notes</h2>
                        <p className="text-sm whitespace-pre-line">{item.notes}</p>
                    </div>
                 )}
            </div>

             <div className="rounded-xl border bg-card text-card-foreground shadow">
                <div className="border-b px-4 py-3 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <h2 className="text-lg font-semibold">Activity Timeline</h2>
                </div>
                <div className="p-4 space-y-4">
                    {logs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No activity recorded.</p>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className="flex gap-3">
                                <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                                    log.actionType === 'CREATE' ? 'bg-green-500' :
                                    log.actionType === 'EDIT' ? 'bg-blue-500' :
                                    log.actionType === 'DELETE' ? 'bg-red-500' : 'bg-gray-500'
                                }`} />
                                <div className="space-y-1">
                                    <p className="text-sm">
                                        <span className="font-medium">{log.userName}</span> {log.actionType.toLowerCase()}d this item
                                        {log.source !== 'WEB' && <span className="text-xs text-muted-foreground ml-2">via {log.source}</span>}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {log.timestamp.toLocaleString()}
                                    </p>
                                    {log.fieldChanges && (
                                        <div className="text-xs bg-muted p-2 rounded mt-1 font-mono break-all">
                                            Changes: {Object.keys(JSON.parse(log.fieldChanges)).join(", ")}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
