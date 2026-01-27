import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getExpenses } from "@/app/(dashboard)/expenses/actions";
import { ExpensesReportView } from "@/components/reports/expenses-report-view";

export default async function ExpenseReportsPage() {
    const session = await auth();
    if (!session?.user) redirect("/login");
    
    if (!hasPermission(session.user.role, PERMISSIONS.EXPENSE_REPORT)) {
        redirect("/");
    }

    const expenses = await getExpenses();

    // Aggregations
    const categoryStats: Record<string, { count: number, amount: number }> = {};
    const vendorStats: Record<string, { count: number, amount: number }> = {};
    const paymentModeStats: Record<string, { count: number, amount: number }> = {};
    const gstTotal = 0;

    expenses.forEach(e => {
        // Category
        const cat = e.category.name;
        if (!categoryStats[cat]) categoryStats[cat] = { count: 0, amount: 0 };
        categoryStats[cat].count++;
        categoryStats[cat].amount += e.totalAmount;

        // Vendor
        const vendor = e.vendorName || "Unknown";
        if (!vendorStats[vendor]) vendorStats[vendor] = { count: 0, amount: 0 };
        vendorStats[vendor].count++;
        vendorStats[vendor].amount += e.totalAmount;

        // Payment Mode
        const mode = e.paymentMode;
        if (!paymentModeStats[mode]) paymentModeStats[mode] = { count: 0, amount: 0 };
        paymentModeStats[mode].count++;
        paymentModeStats[mode].amount += e.totalAmount;

        // GST
        // if (e.gstAmount) gstTotal += e.gstAmount;
    });

    return (
        <div className="p-6">
            <ExpensesReportView 
                expenses={expenses}
                categoryStats={categoryStats}
                vendorStats={vendorStats}
                paymentModeStats={paymentModeStats}
                gstTotal={gstTotal}
            />
        </div>
    );
}
