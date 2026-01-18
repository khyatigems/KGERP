
export async function deleteSale(id: string) {
  const session = await auth();
  if (!session) return { message: "Unauthorized" };

  if (!hasPermission(session.user.role || "STAFF", PERMISSIONS.SALES_DELETE)) {
      return { message: "Insufficient permissions" };
  }

  const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
          inventory: true
      }
  });

  if (!sale) return { message: "Sale not found" };

  try {
      await prisma.$transaction(async (tx) => {
          await tx.inventory.update({
              where: { id: sale.inventoryId },
              data: { status: "IN_STOCK" }
          });

          await tx.sale.delete({
              where: { id }
          });
      });

      await logActivity({
          entityType: "Sale",
          entityId: id,
          entityIdentifier: sale.inventory.sku,
          actionType: "DELETE",
          source: "WEB",
          userId: session.user?.id || "system",
          userEmail: session.user?.email,
          userName: session.user?.name,
          details: `Deleted sale for Item ${sale.inventory.sku}`
      });

  } catch (e) {
      console.error(e);
      return { message: "Failed to delete sale" };
  }

  revalidatePath("/sales");
  revalidatePath("/inventory");
}
