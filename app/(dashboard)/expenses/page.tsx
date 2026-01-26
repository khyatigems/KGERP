import { getExpenses } from "./actions";
import { ExpenseList } from "@/components/expenses/expense-list";
import { ExpenseStats } from "@/components/expenses/expense-stats";
import { ExpenseActions } from "@/components/expenses/expense-actions";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { startOfDay, endOfDay } from "date-fns";

export default async function ExpensesPage() {
    const session = await auth();
    const role = session?.user?.role || "VIEWER";

    if (!hasPermission(role, PERMISSIONS.EXPENSE_VIEW)) {
        return <div className="p-6">Access Denied</div>;
    }

    const canCreate = hasPermission(role, PERMISSIONS.EXPENSE_CREATE);
    const canEdit = hasPermission(role, PERMISSIONS.EXPENSE_EDIT);
    const canDelete = hasPermission(role, PERMISSIONS.EXPENSE_DELETE);

    const expenses = await getExpenses();

    // Calculate Stats
    const totalCount = expenses.length;
    const pendingCount = expenses.filter(e => e.paymentStatus === "PENDING").length;
    
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const todayCount = expenses.filter(e => e.expenseDate >= todayStart && e.expenseDate <= todayEnd).length;

    // Top Category
    const categoryCounts: Record<string, number> = {};
    expenses.forEach(e => {
        const catName = e.category.name;
        categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
    });
    
    let topCategory = "N/A";
    let maxCount = 0;
    for (const [cat, count] of Object.entries(categoryCounts)) {
        if (count > maxCount) {
            maxCount = count;
            topCategory = cat;
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Expenses</h1>
                <div className="flex gap-2">
                    <ExpenseActions expenses={expenses} />
                    {canCreate && (
                        <Link href="/expenses/add">
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Add Expense
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            <ExpenseStats 
                totalCount={totalCount}
                pendingCount={pendingCount}
                todayCount={todayCount}
                topCategory={topCategory}
            />

            <ExpenseList 
                expenses={expenses}
                canEdit={canEdit}
                canDelete={canDelete}
            />
        </div>
    );
}
