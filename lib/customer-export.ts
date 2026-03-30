import { formatDate } from "@/lib/utils";

type CustomerLike = {
  name: string;
  email?: string | null;
  phone?: string | null;
  phoneSecondary?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  pan?: string | null;
  gstin?: string | null;
  notes?: string | null;
  loyaltyPoints?: number | null;
  createdAt: Date;
};

export function buildCustomerExport(customers: CustomerLike[]) {
  const rows = customers.map((c) => ({
    Name: c.name,
    Email: c.email || "",
    "Primary Phone": c.phone ? c.phone.replace(/\D/g, '') : "",
    "Secondary Phone": c.phoneSecondary ? c.phoneSecondary.replace(/\D/g, '') : "",
    Address: c.address || "",
    City: c.city || "",
    State: c.state || "",
    Country: c.country || "",
    Pincode: c.pincode ? c.pincode.replace(/,/g, '') : "",
    PAN: c.pan || "",
    GSTIN: c.gstin || "",
    Notes: c.notes || "",
    "Loyalty Points": Number(c.loyaltyPoints || 0).toFixed(2),
    "Created At": formatDate(c.createdAt),
  }));

  const columns = Object.keys(rows[0] || {}).map((k) => ({ header: k, key: k }));
  return { rows, columns };
}
