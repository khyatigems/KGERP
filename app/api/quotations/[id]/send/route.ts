import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const { id } = await params;
    
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { items: { include: { inventory: true } } }
    });

    if (!quotation) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    
    // Allow sending from DRAFT
    if (quotation.status !== "DRAFT") {
      // If already SENT or higher, maybe allow resend? But for state transition, it should be DRAFT.
      // Or maybe we allow resending notification.
      // But the "Approval Trigger" is "On Send".
      // Let's assume this endpoint is "Submit for Send/Approval".
      if (quotation.status !== "DRAFT") {
          return NextResponse.json({ error: `Cannot send quotation in ${quotation.status} status` }, { status: 400 });
      }
    }

    // --- APPROVAL LOGIC (Part 5) ---
    // const rules = await prisma.approvalRule.findMany({ where: { isActive: true } });
    const rules: any[] = []; // ApprovalRule schema not added yet
    let requiresApproval = false;
    let breachReason = "";

    // Calculate total Cost to determine Margin
    let totalCost = 0;
    for (const item of quotation.items) {
      const inv = item.inventory;
      // If no inventory link (custom item), assume cost is 0 -> 100% margin (safe fallback? or risky?)
      // User spec: "Margin warning threshold".
      // If inventory exists:
      if (inv) {
          let cost = 0;
          if (inv.pricingMode === "PER_CARAT") {
            cost = (inv.purchaseRatePerCarat || 0) * (inv.weightValue || 0);
          } else {
            cost = inv.flatPurchaseCost || 0;
          }
          totalCost += cost;
      }
    }

    const totalRevenue = quotation.totalAmount;
    const marginValue = totalRevenue - totalCost;
    const marginPercent = totalRevenue > 0 ? (marginValue / totalRevenue) * 100 : 0;
    
    // Check Rules
    for (const rule of rules) {
      if (rule.ruleType === "MARGIN" && marginPercent < rule.thresholdValue) {
        requiresApproval = true;
        breachReason = `Margin ${marginPercent.toFixed(2)}% is below threshold ${rule.thresholdValue}%`;
        break;
      }
      if (rule.ruleType === "AMOUNT" && totalRevenue > rule.thresholdValue) {
        requiresApproval = true;
        breachReason = `Total amount ${totalRevenue} exceeds threshold ${rule.thresholdValue}`;
        break;
      }
      // Add Discount rule logic if needed
    }

    // --- STATE TRANSITION ---
    let newStatus = "SENT";
    if (requiresApproval) {
      newStatus = "PENDING_APPROVAL";
    }

    const updatedQuotation = await prisma.quotation.update({
      where: { id },
      data: {
        status: newStatus
      }
    });

    // Log Activity (Assuming implementation or creating a simple one)
    try {
        await prisma.activityLog.create({
            data: {
                entityType: "Quotation",
                entityId: id,
                entityIdentifier: quotation.quotationNumber,
                actionType: "STATUS_CHANGE",
                source: "WEB",
                userId: session.user.id,
                userName: session.user.name,
                fieldChanges: JSON.stringify({ oldStatus: quotation.status, newStatus, breachReason })
            }
        });
    } catch (e) {
        console.warn("Failed to log activity", e);
    }

    return NextResponse.json({ 
      status: newStatus, 
      requiresApproval,
      breachReason,
      quotation: updatedQuotation
    });

  } catch (e) {
    console.error("Send Quotation Error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
