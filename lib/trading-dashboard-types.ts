export type TradingDashboardData = {
  updatedAt: string;
  period: string;
  access: { inventory: boolean; listings: boolean; sales: boolean; customers: boolean; activity: boolean; teamActivity: boolean };
  unavailable: string[];
  inventory: null | { total: number; listed: number | null; unlisted: number | null; preparedUnlisted: number | null; gemstones: { name: string; count: number }[] };
  marketplace: null | { total: number; shops: { id: string; name: string; platform: string; connected: boolean; active: number; drafts: number; errors: number; lastSyncedAt: string | null }[] };
  invoices: null | { total: number; export: number; tax: number; other: number; unpaid: number; recent: { id: string; number: string; type: string; currency: string | null; amount: number | null; inrAmount: number; paymentStatus: string; customer: string; country: string | null }[] };
  customers: null | { new: number; returningBuyers: number };
  activity: { id: string; actorId: string | null; actor: string; role: string | null; action: string; entity: string; reference: string; createdAt: string; changes: { field: string; before: string; after: string }[] }[];
};
