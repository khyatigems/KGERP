import { ExpenseForm } from "@/components/expenses/expense-form";
import { getExpenseCategories } from "../actions";
import { auth } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function AddExpensePage() {
    const session = await auth();
    const role = session?.user?.role || "VIEWER";

    if (!hasPermission(role, PERMISSIONS.EXPENSE_CREATE)) {
        redirect("/expenses");
    }

    const categories = await getExpenseCategories();

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Add New Expense</h1>
            <ExpenseForm categories={categories} />
        </div>
    );
}
