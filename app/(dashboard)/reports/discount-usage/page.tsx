import { getDiscountUsageReport } from "./actions";
import DiscountUsageClientPage from "./discount-usage-client-page";
import { subDays } from "date-fns";

export default async function DiscountUsageReportServerPage() {
  const endDate = new Date();
  const startDate = subDays(endDate, 30); // Default to last 30 days

  const initialReport = await getDiscountUsageReport(startDate, endDate);

  return <DiscountUsageClientPage initialReport={initialReport} />;
}
