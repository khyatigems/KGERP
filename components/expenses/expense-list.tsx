"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { deleteExpense } from "@/app/(dashboard)/expenses/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Expense {
    id: string;
    expenseDate: Date;
    description: string;
    totalAmount: number;
    paymentStatus: string;
    category: { name: string };
    vendorName?: string | null;
}

interface ExpenseListProps {
    expenses: Expense[];
    canEdit: boolean;
    canDelete: boolean;
}

export function ExpenseList({ expenses, canEdit, canDelete }: ExpenseListProps) {
    const router = useRouter();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async () => {
        if (!deletingId) return;
        try {
            await deleteExpense(deletingId);
            toast.success("Expense deleted");
            setDeletingId(null);
        } catch (error) {
            toast.error("Failed to delete expense");
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expenses.map((expense) => (
                <Card key={expense.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {expense.category.name}
                        </CardTitle>
                        <Badge variant={expense.paymentStatus === "PAID" ? "default" : expense.paymentStatus === "PENDING" ? "destructive" : "secondary"}>
                            {expense.paymentStatus}
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{expense.totalAmount.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(expense.expenseDate), "PPP")}
                        </p>
                        <p className="text-sm mt-2 font-medium">{expense.description}</p>
                        {expense.vendorName && (
                            <p className="text-xs text-muted-foreground">Vendor: {expense.vendorName}</p>
                        )}
                        
                        <div className="flex justify-end gap-2 mt-4">
                            {canEdit && (
                                <Button variant="outline" size="sm" onClick={() => router.push(`/expenses/${expense.id}`)}>
                                    <Edit className="h-4 w-4 mr-1" /> Edit
                                </Button>
                            )}
                            {canDelete && (
                                <Button variant="destructive" size="sm" onClick={() => setDeletingId(expense.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}

            <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the expense.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
