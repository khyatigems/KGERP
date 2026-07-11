import { getDiscountUsageReport } from "./actions";
import DiscountUsageClientPage from "./discount-usage-client-page";
import { subDays } from "date-fns";
import { AnimatedPage } from "@/components/ui/animated-page";

export default async function DiscountUsageReportServerPage() {
  const endDate = new Date();
  const startDate = subDays(endDate, 30); // Default to last 30 days

  const initialReport = await getDiscountUsageReport(startDate, endDate);

  return <AnimatedPage><DiscountUsageClientPage initialReport={initialReport} /></AnimatedPage>;
}
