import { getLoyaltyPointsReport } from "./actions";
import LoyaltyPointsClientPage from "./loyalty-points-client-page";
import { subDays } from "date-fns";
import { AnimatedPage } from "@/components/ui/animated-page";

export default async function LoyaltyPointsReportServerPage() {
  const endDate = new Date();
  const startDate = subDays(endDate, 30); // Default to last 30 days

  const initialReport = await getLoyaltyPointsReport(startDate, endDate);

  return <AnimatedPage><LoyaltyPointsClientPage initialReport={initialReport} /></AnimatedPage>;
}
