import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ExportButton } from "@/components/ui/export-button";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Wallet, Receipt, Globe, RefreshCw, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PaymentStatusSelect } from "@/components/invoices/payment-status-select";
import { SalesActions } from "@/components/sales/sales-actions";
import { SalesSortToggle } from "@/components/sales/sales-sort-toggle";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import type { ElementType } from "react";

import { checkPermission } from "@/lib/permission-guard";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Sales History | KhyatiGems™",
};

const ITEMS_PER_PAGE = 10;

function SearchForm({ defaultValue }: { defaultValue: string }) {
  return (
    <form method="GET" className="flex items-center gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="search"
          name="q"
          placeholder="Search by invoice #, customer, item, or amount..."
          defaultValue={defaultValue}
          className="pl-10 w-[350px]"
        />
        {defaultValue && (
          <Link 
            href="/sales" 
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </Link>
        )}
      </div>
      <Button type="submit" variant="secondary" size="sm">
        <Search className="h-4 w-4 mr-1" /> Search
      </Button>
    </form>
  );
}

export default async function SalesPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ 
    sort?: string;
    taxPage?: string;
    exportPage?: string;
    replacementPage?: string;
    q?: string;
  }> 
}) {
  const perm = await checkPermission(PERMISSIONS.SALES_VIEW);
  if (!perm.success) {
    return (
      <div className="p-6">
        <div className="bg-destructive/15 text-destructive border-destructive/20 border px-4 py-3 rounded-md relative">
          <strong className="font-bold">Access Denied!</strong>
          <span className="block sm:inline"> {perm.message}</span>
        </div>
      </div>
    );
  }

  const session = await auth();
  const canDelete = session ? hasPermission(session.user?.role || "STAFF", PERMISSIONS.SALES_DELETE) : false;
  const sp = await searchParams;
  const sortMode = sp.sort === "invoice" ? "invoice" : "date";
  
  // Pagination params
  const taxPage = Math.max(1, parseInt(sp.taxPage || "1", 10));
  const exportPage = Math.max(1, parseInt(sp.exportPage || "1", 10));
  const replacementPage = Math.max(1, parseInt(sp.replacementPage || "1", 10));
  
  // Search query
  const searchQueryRaw = (sp.q || "").trim();
  const searchQuery = searchQueryRaw;

  type SaleRow = {
    id: string;
    orderId: string | null;
    inventoryId: string;
    customerId: string | null;
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    customerAddress: string | null;
    billingAddress: string | null;
    customerCity: string | null;
    placeOfSupply: string | null;
    shippingAddress: string | null;
    shippingCharge: number;
    additionalCharge: number;
    saleDate: Date;
    salePrice: number;
    taxAmount: number;
    discountAmount: number;
    netAmount: number;
    paymentStatus: string | null;
    paymentMethod: string | null;
    platform: string;
    notes: string | null;
    invoiceId: string | null;
    legacyInvoiceId: string | null;
    costPriceSnapshot: number | null;
    profit: number | null;
    inventory: {
      sku: string;
      itemName: string;
      flatPurchaseCost: number | null;
      purchaseRatePerCarat: number | null;
      weightValue: number | null;
    };
    invoice: {
      id: string;
      invoiceNumber: string;
      token: string;
      discountTotal: number;
      totalAmount: number;
      paidAmount: number;
      invoiceType: string;
      displayOptions: string | null;
    } | null;
    legacyInvoice: {
      invoiceNumber: string;
      token: string;
    } | null;
  };

  const baseSearchOr = (() => {
    if (!searchQuery) return undefined;

    const ors: any[] = [
      { customerName: { contains: searchQuery } },
      { customerEmail: { contains: searchQuery } },
      { customerPhone: { contains: searchQuery } },
      { orderId: { contains: searchQuery } },
      { platform: { contains: searchQuery } },
      { inventory: { sku: { contains: searchQuery } } },
      { inventory: { itemName: { contains: searchQuery } } },
      { invoice: { is: { invoiceNumber: { contains: searchQuery } } } },
      { legacyInvoice: { is: { invoiceNumber: { contains: searchQuery } } } },
    ];

    const maybeAmount = Number(searchQuery);
    if (Number.isFinite(maybeAmount)) {
      ors.push({ netAmount: { equals: maybeAmount } });
      ors.push({ salePrice: { equals: maybeAmount } });
    }

    return ors;
  })();

  const orderBy = sortMode === "invoice"
    ? ([
        { invoiceId: "desc" as const },
        { invoice: { invoiceNumber: "desc" as const } },
        { saleDate: "desc" as const },
      ] as const)
    : ([{ saleDate: "desc" as const }] as const);

  const baseSelect = {
    id: true,
    orderId: true,
    inventoryId: true,
    customerId: true,
    customerName: true,
    customerEmail: true,
    customerPhone: true,
    customerAddress: true,
    billingAddress: true,
    customerCity: true,
    placeOfSupply: true,
    shippingAddress: true,
    shippingCharge: true,
    additionalCharge: true,
    saleDate: true,
    salePrice: true,
    taxAmount: true,
    discountAmount: true,
    netAmount: true,
    paymentStatus: true,
    paymentMethod: true,
    platform: true,
    notes: true,
    invoiceId: true,
    legacyInvoiceId: true,
    costPriceSnapshot: true,
    profit: true,
    inventory: {
      select: {
        sku: true,
        itemName: true,
        flatPurchaseCost: true,
        purchaseRatePerCarat: true,
        weightValue: true,
      },
    },
    invoice: {
      select: {
        id: true,
        invoiceNumber: true,
        token: true,
        discountTotal: true,
        totalAmount: true,
        paidAmount: true,
        invoiceType: true,
        displayOptions: true,
      },
    },
    legacyInvoice: {
      select: {
        invoiceNumber: true,
        token: true,
      },
    },
  };

  const makeWhere = (section: "TAX" | "EXPORT" | "REPLACEMENT") => {
    const and: any[] = [];

    if (baseSearchOr) {
      and.push({ OR: baseSearchOr });
    }

    if (section === "REPLACEMENT") {
      and.push({ platform: "REPLACEMENT" });
    } else {
      and.push({ platform: { not: "REPLACEMENT" } });
      if (section === "EXPORT") {
        and.push({ invoice: { is: { invoiceType: "EXPORT_INVOICE" } } });
      } else {
        and.push({ OR: [{ invoice: { is: { invoiceType: { not: "EXPORT_INVOICE" } } } }, { invoice: null }] });
      }
    }

    return and.length ? { AND: and } : {};
  };

  const fetchSection = async (section: "TAX" | "EXPORT" | "REPLACEMENT", page: number) => {
    const where = makeWhere(section);
    const [rows, totalItems] = await Promise.all([
      prisma.sale.findMany({
        where,
        orderBy: orderBy as any,
        skip: (page - 1) * ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
        select: baseSelect as any,
      }) as unknown as Promise<SaleRow[]>,
      prisma.sale.count({ where }),
    ]);
    return { rows, totalItems };
  };

  const templatesPromise = prisma.$queryRawUnsafe<Array<{
    id: string;
    key: string;
    title: string;
    body: string;
    channel: string;
    isActive: number;
  }>>(`
    SELECT id, key, title, body, channel, isActive
    FROM "MessageTemplate"
    WHERE channel = 'WHATSAPP_WEB'
    AND isActive = 1
    ORDER BY createdAt DESC
    LIMIT 200
  `).catch(() => []);

  const [taxResult, exportResult, replacementResult, templateRows] = await Promise.all([
    fetchSection("TAX", taxPage),
    fetchSection("EXPORT", exportPage),
    fetchSection("REPLACEMENT", replacementPage),
    templatesPromise,
  ]);

  const messageTemplates = templateRows.map((row) => ({
    id: row.id,
    key: row.key,
    title: row.title,
    body: row.body,
  }));

  const baseInvoiceUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  const exportAllUrl = (() => {
    const params = new URLSearchParams();
    if (sortMode === "invoice") params.set("sort", "invoice");
    if (searchQuery) params.set("q", searchQuery);
    return `/api/reports/sales/export?${params.toString()}`;
  })();

  const taxSales = taxResult.rows;
  const exportSales = exportResult.rows;
  const replacementSales = replacementResult.rows;

  const getTotalPages = (count: number) => Math.ceil(count / ITEMS_PER_PAGE);

  const mapExportRow = (sale: SaleRow) => ({
    date: formatDate(sale.saleDate),
    invoice: sale.invoice?.invoiceNumber || sale.legacyInvoice?.invoiceNumber || "-",
    customer: sale.customerName,
    item: `${sale.inventory.sku} - ${sale.inventory.itemName}`,
    platform: sale.platform,
    invoiceType: sale.invoice?.invoiceType || null,
    amount: formatCurrency(sale.netAmount),
    profit: formatCurrency(sale.profit ?? 0),
    status: sale.paymentStatus || "PENDING",
  });

  const columns = [
    { header: "Date", key: "date" },
    { header: "Invoice #", key: "invoice" },
    { header: "Customer", key: "customer" },
    { header: "Item", key: "item" },
    { header: "Platform", key: "platform" },
    { header: "Net Amount", key: "amount" },
    { header: "Profit", key: "profit" },
    { header: "Status", key: "status" }
  ];

  // Export reflects the currently visible page rows only (server-side pagination).
  const exportMultiTable = [
    { title: "Tax Invoice Sales", rows: taxSales.map(mapExportRow), columns },
    { title: "Export Invoice Sales", rows: exportSales.map(mapExportRow), columns },
    { title: "Replacement Invoices", rows: replacementSales.map(mapExportRow), columns },
  ];

  // Pagination component
  function Pagination({ 
    currentPage, 
    totalPages, 
    totalItems, 
    paramName 
  }: { 
    currentPage: number; 
    totalPages: number; 
    totalItems: number;
    paramName: string;
  }) {
    if (totalPages <= 1) return null;

    const getPageUrl = (page: number) => {
      const params = new URLSearchParams();
      if (sortMode === "invoice") params.set("sort", "invoice");
      if (searchQuery) params.set("q", searchQuery);
      if (paramName === "taxPage") params.set("taxPage", page.toString());
      if (paramName === "exportPage") params.set("exportPage", page.toString());
      if (paramName === "replacementPage") params.set("replacementPage", page.toString());
      // Preserve other page params
      if (paramName !== "taxPage" && taxPage > 1) params.set("taxPage", taxPage.toString());
      if (paramName !== "exportPage" && exportPage > 1) params.set("exportPage", exportPage.toString());
      if (paramName !== "replacementPage" && replacementPage > 1) params.set("replacementPage", replacementPage.toString());
      return `/sales?${params.toString()}`;
    };

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50/50">
        <div className="text-sm text-gray-500">
          Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalItems)} - {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            disabled={currentPage <= 1}
          >
            <Link href={getPageUrl(currentPage - 1)} className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            asChild
            disabled={currentPage >= totalPages}
          >
            <Link href={getPageUrl(currentPage + 1)} className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Sale table component
  function SaleTable({ 
    sales, 
    title, 
    icon: Icon, 
    type,
    currentPage,
    totalPages,
    totalItems,
    paramName
  }: { 
    sales: SaleRow[]; 
    title: string; 
    icon: ElementType;
    type: "TAX" | "EXPORT" | "REPLACEMENT";
    currentPage: number;
    totalPages: number;
    totalItems: number;
    paramName: string;
  }) {
    if (totalItems === 0) return null;

    const isExport = type === "EXPORT";
    const isReplacement = type === "REPLACEMENT";

    return (
      <div className={`rounded-md border ${isExport ? 'border-blue-200' : isReplacement ? 'border-amber-200' : ''}`}>
        <div className={`px-4 py-3 border-b ${isExport ? 'bg-blue-50 border-blue-200' : isReplacement ? 'bg-amber-50 border-amber-200' : 'bg-gray-50'}`}>
          <h2 className={`text-lg font-semibold flex items-center gap-2 ${isExport ? 'text-blue-800' : isReplacement ? 'text-amber-800' : 'text-gray-800'}`}>
            <Icon className={`h-5 w-5 ${isExport ? 'text-blue-600' : isReplacement ? 'text-amber-600' : 'text-gray-600'}`} />
            {title}
            <Badge variant={isExport ? "default" : isReplacement ? "secondary" : "secondary"} className={isExport ? "bg-blue-600" : isReplacement ? "bg-amber-600" : ""}>
              {totalItems}
            </Badge>
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className={isExport ? 'bg-blue-50/50' : isReplacement ? 'bg-amber-50/50' : ''}>
              <TableHead>Date</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Net Amount</TableHead>
              <TableHead>Profit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => {
              const invoiceType = sale.invoice?.invoiceType;
              const isExportInvoice = invoiceType === "EXPORT_INVOICE";
              
              return (
                <TableRow 
                  key={sale.id} 
                  className={isExportInvoice ? 'bg-blue-50/30 hover:bg-blue-50/50' : isReplacement ? 'bg-amber-50/30 hover:bg-amber-50/50' : ''}
                >
                  <TableCell>{formatDate(sale.saleDate)}</TableCell>
                  <TableCell className="font-medium">
                    {sale.invoice?.invoiceNumber || sale.legacyInvoice?.invoiceNumber || "-"}
                  </TableCell>
                  <TableCell>
                    {isExportInvoice ? (
                      <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
                        <Globe className="h-3 w-3 mr-1" /> EXPORT
                      </Badge>
                    ) : isReplacement ? (
                      <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                        <RefreshCw className="h-3 w-3 mr-1" /> REPLACEMENT
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-gray-300 text-gray-700 bg-gray-50">
                        <Receipt className="h-3 w-3 mr-1" /> TAX
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{sale.customerName || "Walk-in"}</span>
                      {sale.customerCity && (
                        <span className="text-xs text-muted-foreground">
                          {sale.customerCity}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{sale.inventory.sku}</span>
                      <span className="text-xs text-muted-foreground">{sale.inventory.itemName}</span>
                    </div>
                  </TableCell>
                  <TableCell>{sale.platform}</TableCell>
                  <TableCell>{formatCurrency(sale.netAmount)}</TableCell>
                  <TableCell className="text-green-600">
                    {formatCurrency(sale.profit ?? 0)}
                  </TableCell>
                  <TableCell>
                    {sale.invoice?.id && !isReplacement ? (
                      <PaymentStatusSelect 
                        invoiceId={sale.invoice.id} 
                        currentStatus={sale.paymentStatus || "PENDING"} 
                        totalAmount={sale.invoice.totalAmount}
                        amountDue={Math.max(0, sale.invoice.totalAmount - (sale.invoice.paidAmount || 0))}
                      />
                    ) : (
                      <Badge variant={isReplacement ? "outline" : "outline"} className={isReplacement ? "text-amber-600" : ""}>
                        {isReplacement ? "REPLACEMENT" : (sale.paymentStatus || "PENDING")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <SalesActions 
                      saleId={sale.id} 
                      invoiceToken={sale.invoice?.token || sale.legacyInvoice?.token} 
                      invoiceNumber={sale.invoice?.invoiceNumber || sale.legacyInvoice?.invoiceNumber || undefined} 
                      customerName={sale.customerName || undefined}
                      customerPhone={sale.customerPhone || undefined}
                      invoiceUrl={sale.invoice?.token && baseInvoiceUrl ? `${baseInvoiceUrl.replace(/\/$/, "")}/invoice/${sale.invoice.token}` : undefined}
                      messageTemplates={messageTemplates}
                      canDelete={canDelete}
                      allowConfigureInvoice={!isReplacement}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          totalItems={totalItems}
          paramName={paramName}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Sales History</h1>
          <div className="flex items-center gap-2">
            <div className="flex gap-2 mr-4">
              <Badge variant="secondary" className="px-3 py-1">
                <Receipt className="h-4 w-4 mr-1" /> TAX: {taxResult.totalItems}
              </Badge>
              <Badge className="bg-blue-600 px-3 py-1">
                <Globe className="h-4 w-4 mr-1" /> EXPORT: {exportResult.totalItems}
              </Badge>
              <Badge className="bg-amber-600 px-3 py-1">
                <RefreshCw className="h-4 w-4 mr-1" /> REPLACEMENT: {replacementResult.totalItems}
              </Badge>
            </div>
            <SalesSortToggle />
            <Link href="/advances">
              <Button variant="outline">
                <Wallet className="mr-2 h-4 w-4" />
                Record Advance
              </Button>
            </Link>
            <Link href="/sales/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Record New Sale
              </Button>
            </Link>
            <ExportButton 
              filename="sales_report" 
              multiTable={exportMultiTable}
              title="Sales Report" 
            />
            <Button variant="outline" size="sm" asChild>
              <a href={exportAllUrl} rel="noopener noreferrer">
                Export All (CSV)
              </a>
            </Button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="flex items-center gap-4">
          <SearchForm defaultValue={searchQueryRaw} />
          {searchQueryRaw && (
            <div className="text-sm text-gray-600">
              Found <span className="font-semibold">{taxResult.totalItems + exportResult.totalItems + replacementResult.totalItems}</span> result{(taxResult.totalItems + exportResult.totalItems + replacementResult.totalItems) !== 1 ? 's' : ''} for &quot;<span className="font-medium">{searchQuery}</span>&quot;
            </div>
          )}
        </div>
      </div>

      {(taxResult.totalItems + exportResult.totalItems + replacementResult.totalItems) === 0 ? (
        <div className="rounded-md border">
          <div className="h-24 flex flex-col items-center justify-center text-gray-500 gap-2">
            {searchQueryRaw ? (
              <>
                <p>No results found for &quot;<span className="font-medium">{searchQuery}</span>&quot;</p>
                <Link href="/sales">
                  <Button variant="outline" size="sm">
                    <X className="h-4 w-4 mr-1" /> Clear Search
                  </Button>
                </Link>
              </>
            ) : (
              <p>No sales recorded yet.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Export Invoices Section */}
          <SaleTable 
            sales={exportSales}
            title="Export Invoice Sales" 
            icon={Globe}
            type="EXPORT"
            currentPage={exportPage}
            totalPages={getTotalPages(exportResult.totalItems)}
            totalItems={exportResult.totalItems}
            paramName="exportPage"
          />

          {/* Tax Invoices Section */}
          <SaleTable 
            sales={taxSales}
            title="Tax Invoice Sales" 
            icon={Receipt}
            type="TAX"
            currentPage={taxPage}
            totalPages={getTotalPages(taxResult.totalItems)}
            totalItems={taxResult.totalItems}
            paramName="taxPage"
          />

          {/* Replacement Invoices Section */}
          <SaleTable 
            sales={replacementSales}
            title="Replacement Invoices" 
            icon={RefreshCw}
            type="REPLACEMENT"
            currentPage={replacementPage}
            totalPages={getTotalPages(replacementResult.totalItems)}
            totalItems={replacementResult.totalItems}
            paramName="replacementPage"
          />
        </div>
      )}
    </div>
  );
}
