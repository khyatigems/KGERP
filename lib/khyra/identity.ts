/** Khyra's public identity and general speech live here, not in individual ERP modules. */
export const KHYRA = {
  name: "Khyra",
  fullIdentity: "Khyra – Your KhyatiGems Companion",
  introduction: "I'm Khyra! How can I make your work easier today?",
  introductionDetail: "Your updates, business reviews and next steps are right here.",
  ready: "Ready to make your next step easier",
  quiet: "Quiet and ready whenever you need me",
  encouragement: "Every carefully documented gemstone makes the next decision easier.",
  activityUpdated: "I have an update for you",
  activityDetails: "Open Activity to see the details and available actions.",
  checking: "I'm checking the latest business records.",
  checkUnavailable: "I couldn't check the latest records. Would you like to try again?",
  reviewIntro: "Here's what the latest permitted records show. Opening a report or ticking your checklist doesn't confirm a business issue is resolved.",
  noSources: "I don't have any attention sources available for your current access.",
  greeting: {
    morning: "Good morning! Shall we see what needs your attention today?",
    afternoon: "Good afternoon! Ready to pick up your next task?",
    evening: "Good evening! Shall we review where things stand?",
    returning: "Welcome back! What would you like to work on next?",
  },
} as const;

export function khyraGreeting(hour: number, firstVisit: boolean) {
  if (firstVisit) return KHYRA.introduction;
  return hour >= 5 && hour < 12 ? KHYRA.greeting.morning : hour >= 12 && hour < 17 ? KHYRA.greeting.afternoon : hour >= 17 && hour < 23 ? KHYRA.greeting.evening : KHYRA.greeting.returning;
}
export function khyraContextForPath(pathname: string) {
  const contexts = [
    ["/inventory", "inventory", "Inventory", "Shall we review gemstone details, photographs or certificate readiness?"],
    ["/marketplace", "marketplace", "Marketplace", "I can help you find the existing sync history, orders and listing reviews."],
    ["/reports", "reports", "Reports", "Shall we review a report or check the result of an export?"],
    ["/sales", "sales", "Sales", "Your permitted sales and invoice tools are ready when you need them."],
    ["/invoices", "invoices", "Invoices", "Shall we review an invoice or its recorded payment history?"],
    ["/notes", "notes", "Notes", "Your notes and checklists are here to keep the next step clear."],
    ["/work-tracker", "work_tracker", "Work tracker", "Would you like to review your recorded work or the next target?"],
    ["/settings", "settings", "Settings", "I can point you towards the settings your account is allowed to manage."],
    ["/customers", "customers", "Customers", "Shall we review the existing customer details and permitted follow-ups?"],
    ["/erp/packaging", "packaging", "Packaging", "Let's check the existing packaging tools and readiness details."],
  ];
  const context = contexts.find(([prefix]) => pathname.startsWith(prefix));
  return context ? { module: context[1], label: context[2], message: context[3] } : { module: "general", label: "Your workspace", message: "What would make your next step easier? Your permitted tools are right here." };
}
