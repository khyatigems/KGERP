import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, FilePlus, PackagePlus, Printer, Send } from "lucide-react";

interface TodaysActionsData {
    inventory: number;
    quotations: number;
    labels: number;
    invoices: number;
}

export function TodaysActionsWidget({ data }: { data: TodaysActionsData }) {
    if (!data) return null;

    const items = [
        { 
            label: "Inventory Added", 
            count: data.inventory, 
            icon: PackagePlus, 
            color: "text-emerald-600 dark:text-emerald-400", 
            bg: "bg-emerald-100/50 dark:bg-emerald-500/10",
            labelColor: "text-emerald-700 dark:text-emerald-300"
        },
        { 
            label: "Quotations Sent", 
            count: data.quotations, 
            icon: Send, 
            color: "text-blue-600 dark:text-blue-400", 
            bg: "bg-blue-100/50 dark:bg-blue-500/10",
            labelColor: "text-blue-700 dark:text-blue-300"
        },
        { 
            label: "Labels Printed", 
            count: data.labels, 
            icon: Printer, 
            color: "text-purple-600 dark:text-purple-400", 
            bg: "bg-purple-100/50 dark:bg-purple-500/10",
            labelColor: "text-purple-700 dark:text-purple-300"
        },
        { 
            label: "Invoices Created", 
            count: data.invoices, 
            icon: FilePlus, 
            color: "text-orange-600 dark:text-orange-400", 
            bg: "bg-orange-100/50 dark:bg-orange-500/10",
            labelColor: "text-orange-700 dark:text-orange-300"
        },
    ];

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Today's Actions
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-3">
                    {items.map((item) => (
                        <div key={item.label} className={`flex flex-col p-3 rounded-lg border border-border/50 ${item.bg}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <item.icon className={`h-4 w-4 ${item.color}`} />
                                <span className={`text-xs font-medium ${item.labelColor}`}>{item.label}</span>
                            </div>
                            <span className={`text-2xl font-bold ${item.color}`}>{item.count}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
