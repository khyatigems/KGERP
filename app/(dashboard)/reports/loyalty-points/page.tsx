import { getLoyaltyPointsReport } from "./actions";
import LoyaltyPointsClientPage from "./loyalty-points-client-page";
import { subDays } from "date-fns";

export default async function LoyaltyPointsReportServerPage() {
  const endDate = new Date();
  const startDate = subDays(endDate, 30); // Default to last 30 days

  const initialReport = await getLoyaltyPointsReport(startDate, endDate);

  return <LoyaltyPointsClientPage initialReport={initialReport} />;
}
