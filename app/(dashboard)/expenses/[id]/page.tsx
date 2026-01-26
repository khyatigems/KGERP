import { ExpenseForm } from "@/components/expenses/expense-form";
import { getExpenseCategories } from "../actions";
import { auth } from "@/lib/auth";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditExpensePage({ params }: PageProps) {
    const session = await auth();
    const role = session?.user?.role || "VIEWER";
    const { id } = await params;

    if (!hasPermission(role, PERMISSIONS.EXPENSE_EDIT)) {
        redirect("/expenses");
    }

    const categories = await getExpenseCategories();
    const expense = await prisma.expense.findUnique({
        where: { id }
    });

    if (!expense) {
        redirect("/expenses");
    }

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Edit Expense</h1>
            <ExpenseForm categories={categories} initialData={expense} />
        </div>
    );
}
