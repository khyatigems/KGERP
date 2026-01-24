import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, TrendingUp, Truck, PieChart, FileText, FileCheck, Printer, Lock } from "lucide-react";
import Link from "next/link";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export default async function ReportsHubPage() {
    const session = await auth();
    if (!session?.user) redirect("/login");
    
    if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) {
        redirect("/");
    }

    const canViewFinancials = hasPermission(session.user.role, PERMISSIONS.REPORTS_FINANCIAL);
    const canViewVendor = hasPermission(session.user.role, PERMISSIONS.REPORTS_VENDOR);

    const reports = [
        {
            title: "Inventory Reports",
            description: "Stock levels, aging, category breakdown",
            icon: Package,
            href: "/reports/inventory",
            allowed: true
        },
        {
            title: "Sales Reports",
            description: "Revenue, platform performance, top SKUs",
            icon: TrendingUp,
            href: "/reports/sales",
            allowed: true 
        },
        {
            title: "Vendor Reports",
            description: "Vendor dependency, slow-moving stock",
            icon: Truck,
            href: "/reports/vendor",
            allowed: canViewVendor
        },
        {
            title: "Profit & Margin",
            description: "Net profit, SKU margins, platform margins",
            icon: PieChart,
            href: "/reports/profit",
            allowed: canViewFinancials
        },
        {
            title: "Quotation Analytics",
            description: "Conversion rates, sent vs expired",
            icon: FileText,
            href: "/reports/quotations",
            allowed: true
        },
        {
            title: "Invoice Reports",
            description: "Paid/Unpaid status, outstanding aging",
            icon: FileCheck,
            href: "/reports/invoices",
            allowed: true
        },
        {
            title: "Label & Ops",
            description: "Printing activity, user logs",
            icon: Printer,
            href: "/reports/ops",
            allowed: true
        }
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {reports.map((report) => (
                    <Link 
                        key={report.title} 
                        href={report.allowed ? report.href : "#"}
                        className={!report.allowed ? "cursor-not-allowed opacity-60 pointer-events-none" : ""}
                        aria-disabled={!report.allowed}
                    >
                        <Card className="h-full hover:bg-muted/50 transition-colors">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <report.icon className={`h-8 w-8 ${report.allowed ? "text-primary" : "text-muted-foreground"}`} />
                                    {!report.allowed && <Lock className="h-4 w-4 text-muted-foreground" />}
                                </div>
                                <CardTitle className="mt-4">{report.title}</CardTitle>
                                <CardDescription>{report.description}</CardDescription>
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
