
Object.defineProperty(exports, "__esModule", { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  NotFoundError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime
} = require('./runtime/wasm.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError
Prisma.PrismaClientInitializationError = PrismaClientInitializationError
Prisma.PrismaClientValidationError = PrismaClientValidationError
Prisma.NotFoundError = NotFoundError
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag
Prisma.empty = empty
Prisma.join = join
Prisma.raw = raw
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = Extensions.getExtensionContext
Prisma.defineExtension = Extensions.defineExtension

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}





/**
 * Enums
 */
exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  password: 'password',
  role: 'role',
  roleId: 'roleId',
  avatar: 'avatar',
  avatarUrl: 'avatarUrl',
  avatarHistory: 'avatarHistory',
  themePreference: 'themePreference',
  premiumMode: 'premiumMode',
  lastLogin: 'lastLogin',
  lastPasswordChange: 'lastPasswordChange',
  forceLogoutBefore: 'forceLogoutBefore',
  createdAt: 'createdAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  eventKey: 'eventKey',
  type: 'type',
  title: 'title',
  message: 'message',
  href: 'href',
  readAt: 'readAt',
  createdAt: 'createdAt'
};

exports.Prisma.PermissionScalarFieldEnum = {
  id: 'id',
  module: 'module',
  action: 'action',
  key: 'key',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RoleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  isSystem: 'isSystem',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RolePermissionScalarFieldEnum = {
  id: 'id',
  roleId: 'roleId',
  permissionId: 'permissionId'
};

exports.Prisma.UserPermissionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  permissionId: 'permissionId',
  allow: 'allow'
};

exports.Prisma.InventoryMetricsScalarFieldEnum = {
  inventoryId: 'inventoryId',
  daysInStock: 'daysInStock',
  memoDays: 'memoDays',
  lastUpdated: 'lastUpdated'
};

exports.Prisma.LandingPageSettingsScalarFieldEnum = {
  id: 'id',
  brandTitle: 'brandTitle',
  subtitle: 'subtitle',
  accessNotice: 'accessNotice',
  highlightsEnabled: 'highlightsEnabled',
  whatsNewEnabled: 'whatsNewEnabled',
  highlights: 'highlights',
  whatsNewText: 'whatsNewText',
  whatsNewUpdatedAt: 'whatsNewUpdatedAt',
  activeVersion: 'activeVersion',
  updatedByUserId: 'updatedByUserId',
  updatedAt: 'updatedAt'
};

exports.Prisma.LandingPageVersionScalarFieldEnum = {
  id: 'id',
  versionNumber: 'versionNumber',
  snapshot: 'snapshot',
  createdByUserId: 'createdByUserId',
  createdAt: 'createdAt',
  isRollback: 'isRollback'
};

exports.Prisma.WhatsNewEntryScalarFieldEnum = {
  id: 'id',
  message: 'message',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CategoryCodeScalarFieldEnum = {
  id: 'id',
  name: 'name',
  code: 'code',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GemstoneCodeScalarFieldEnum = {
  id: 'id',
  name: 'name',
  code: 'code',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ColorCodeScalarFieldEnum = {
  id: 'id',
  name: 'name',
  code: 'code',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CutCodeScalarFieldEnum = {
  id: 'id',
  name: 'name',
  code: 'code',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ShapeCodeScalarFieldEnum = {
  id: 'id',
  name: 'name',
  code: 'code',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CollectionCodeScalarFieldEnum = {
  id: 'id',
  name: 'name',
  code: 'code',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RashiCodeScalarFieldEnum = {
  id: 'id',
  name: 'name',
  code: 'code',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CertificateCodeScalarFieldEnum = {
  id: 'id',
  name: 'name',
  code: 'code',
  remarks: 'remarks',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.VendorScalarFieldEnum = {
  id: 'id',
  name: 'name',
  phone: 'phone',
  email: 'email',
  address: 'address',
  city: 'city',
  state: 'state',
  country: 'country',
  vendorType: 'vendorType',
  gstin: 'gstin',
  pan: 'pan',
  notes: 'notes',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CustomerScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  phoneSecondary: 'phoneSecondary',
  address: 'address',
  city: 'city',
  state: 'state',
  country: 'country',
  pincode: 'pincode',
  pan: 'pan',
  gstin: 'gstin',
  notes: 'notes',
  customerType: 'customerType',
  assignedSalesperson: 'assignedSalesperson',
  interestedIn: 'interestedIn',
  budgetRange: 'budgetRange',
  whatsappNumber: 'whatsappNumber',
  preferredContact: 'preferredContact',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  stateCode: 'stateCode',
  countryCode: 'countryCode',
  isInternational: 'isInternational'
};

exports.Prisma.CustomerAdvanceScalarFieldEnum = {
  id: 'id',
  customerId: 'customerId',
  amount: 'amount',
  paymentMode: 'paymentMode',
  paymentRef: 'paymentRef',
  notes: 'notes',
  isAdjusted: 'isAdjusted',
  adjustedAmount: 'adjustedAmount',
  remainingAmount: 'remainingAmount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CustomerAdvanceAdjustmentScalarFieldEnum = {
  id: 'id',
  advanceId: 'advanceId',
  saleId: 'saleId',
  amountUsed: 'amountUsed',
  createdAt: 'createdAt'
};

exports.Prisma.InventoryScalarFieldEnum = {
  id: 'id',
  sku: 'sku',
  itemName: 'itemName',
  internalName: 'internalName',
  category: 'category',
  gemType: 'gemType',
  stoneType: 'stoneType',
  description: 'description',
  productDescription: 'productDescription',
  etsyDescription: 'etsyDescription',
  pieces: 'pieces',
  weightValue: 'weightValue',
  weightUnit: 'weightUnit',
  carats: 'carats',
  weightRatti: 'weightRatti',
  weightGrams: 'weightGrams',
  costPrice: 'costPrice',
  sellingPrice: 'sellingPrice',
  profit: 'profit',
  condition: 'condition',
  status: 'status',
  hideFromAttention: 'hideFromAttention',
  location: 'location',
  certificateNo: 'certificateNo',
  certificateNumber: 'certificateNumber',
  certification: 'certification',
  lab: 'lab',
  certificateLab: 'certificateLab',
  shape: 'shape',
  color: 'color',
  clarity: 'clarity',
  clarityGrade: 'clarityGrade',
  cut: 'cut',
  cutGrade: 'cutGrade',
  polish: 'polish',
  symmetry: 'symmetry',
  fluorescence: 'fluorescence',
  measurements: 'measurements',
  dimensionsMm: 'dimensionsMm',
  tablePercent: 'tablePercent',
  depthPercent: 'depthPercent',
  ratio: 'ratio',
  origin: 'origin',
  originCountry: 'originCountry',
  treatment: 'treatment',
  cutPolishedIn: 'cutPolishedIn',
  qcCode: 'qcCode',
  hsnCode: 'hsnCode',
  transparency: 'transparency',
  braceletType: 'braceletType',
  standardSize: 'standardSize',
  beadSizeMm: 'beadSizeMm',
  beadSizeLabel: 'beadSizeLabel',
  beadCount: 'beadCount',
  holeSizeMm: 'holeSizeMm',
  innerCircumferenceMm: 'innerCircumferenceMm',
  pricingMode: 'pricingMode',
  sellingRatePerCarat: 'sellingRatePerCarat',
  flatSellingPrice: 'flatSellingPrice',
  purchaseRatePerCarat: 'purchaseRatePerCarat',
  flatPurchaseCost: 'flatPurchaseCost',
  notes: 'notes',
  certificateComments: 'certificateComments',
  stockLocation: 'stockLocation',
  purchaseId: 'purchaseId',
  vendorId: 'vendorId',
  batchId: 'batchId',
  imageUrl: 'imageUrl',
  videoUrl: 'videoUrl',
  rapPrice: 'rapPrice',
  discountPercent: 'discountPercent',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  categoryCodeId: 'categoryCodeId',
  gemstoneCodeId: 'gemstoneCodeId',
  colorCodeId: 'colorCodeId',
  cutCodeId: 'cutCodeId',
  collectionCodeId: 'collectionCodeId'
};

exports.Prisma.InventoryPairScalarFieldEnum = {
  id: 'id',
  inventoryIdA: 'inventoryIdA',
  inventoryIdB: 'inventoryIdB',
  matchType: 'matchType',
  score: 'score',
  matchDetails: 'matchDetails',
  status: 'status',
  suggestedPrice: 'suggestedPrice',
  createdById: 'createdById',
  confirmedById: 'confirmedById',
  createdAt: 'createdAt',
  confirmedAt: 'confirmedAt',
  soldAt: 'soldAt'
};

exports.Prisma.InventorySetScalarFieldEnum = {
  id: 'id',
  name: 'name',
  matchType: 'matchType',
  itemCount: 'itemCount',
  score: 'score',
  matchDetails: 'matchDetails',
  status: 'status',
  suggestedPrice: 'suggestedPrice',
  createdById: 'createdById',
  confirmedById: 'confirmedById',
  createdAt: 'createdAt',
  confirmedAt: 'confirmedAt',
  soldAt: 'soldAt'
};

exports.Prisma.InventorySetItemScalarFieldEnum = {
  id: 'id',
  setId: 'setId',
  inventoryId: 'inventoryId',
  position: 'position'
};

exports.Prisma.InventoryMediaScalarFieldEnum = {
  id: 'id',
  inventoryId: 'inventoryId',
  mediaUrl: 'mediaUrl',
  type: 'type',
  isPrimary: 'isPrimary',
  createdAt: 'createdAt'
};

exports.Prisma.PurchaseScalarFieldEnum = {
  id: 'id',
  invoiceNo: 'invoiceNo',
  purchaseDate: 'purchaseDate',
  vendorId: 'vendorId',
  totalAmount: 'totalAmount',
  paymentStatus: 'paymentStatus',
  paymentMode: 'paymentMode',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PurchaseItemScalarFieldEnum = {
  id: 'id',
  purchaseId: 'purchaseId',
  itemName: 'itemName',
  category: 'category',
  shape: 'shape',
  dimensions: 'dimensions',
  beadSizeMm: 'beadSizeMm',
  weightValue: 'weightValue',
  weightUnit: 'weightUnit',
  quantity: 'quantity',
  unitCost: 'unitCost',
  totalCost: 'totalCost',
  notes: 'notes'
};

exports.Prisma.PurchasePaymentScalarFieldEnum = {
  id: 'id',
  purchaseId: 'purchaseId',
  amount: 'amount',
  date: 'date',
  method: 'method',
  reference: 'reference',
  chequeNumber: 'chequeNumber',
  bankName: 'bankName',
  chequePayee: 'chequePayee',
  chequeDate: 'chequeDate',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ListingScalarFieldEnum = {
  id: 'id',
  inventoryId: 'inventoryId',
  platform: 'platform',
  externalId: 'externalId',
  listedPrice: 'listedPrice',
  currency: 'currency',
  status: 'status',
  listedDate: 'listedDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  listingUrl: 'listingUrl',
  listingRef: 'listingRef',
  listingSku: 'listingSku',
  marketplaceTitle: 'marketplaceTitle',
  marketplacePrice: 'marketplacePrice',
  marketplaceQuantity: 'marketplaceQuantity',
  marketplaceViews: 'marketplaceViews',
  marketplaceFavorites: 'marketplaceFavorites',
  marketplaceOrders: 'marketplaceOrders',
  marketplaceShopName: 'marketplaceShopName',
  marketplaceShopId: 'marketplaceShopId',
  syncStatus: 'syncStatus',
  syncError: 'syncError',
  lastSyncedAt: 'lastSyncedAt',
  rawMetadata: 'rawMetadata'
};

exports.Prisma.ListingPriceHistoryScalarFieldEnum = {
  id: 'id',
  listingId: 'listingId',
  price: 'price',
  changedBy: 'changedBy',
  changedAt: 'changedAt'
};

exports.Prisma.ListingMetricSnapshotScalarFieldEnum = {
  id: 'id',
  inventoryId: 'inventoryId',
  marketplace: 'marketplace',
  externalId: 'externalId',
  capturedAt: 'capturedAt',
  views: 'views',
  watches: 'watches',
  favourites: 'favourites',
  orders: 'orders',
  revenue: 'revenue',
  currency: 'currency',
  rawPayload: 'rawPayload',
  source: 'source'
};

exports.Prisma.ListingOpportunityScalarFieldEnum = {
  id: 'id',
  inventoryId: 'inventoryId',
  marketplace: 'marketplace',
  externalId: 'externalId',
  currentViews: 'currentViews',
  currentWatches: 'currentWatches',
  currentFavourites: 'currentFavourites',
  currentOrders: 'currentOrders',
  currentRevenue: 'currentRevenue',
  currency: 'currency',
  lastSyncedAt: 'lastSyncedAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SaleScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  inventoryId: 'inventoryId',
  customerId: 'customerId',
  customerName: 'customerName',
  customerEmail: 'customerEmail',
  customerPhone: 'customerPhone',
  customerAddress: 'customerAddress',
  billingAddress: 'billingAddress',
  customerCity: 'customerCity',
  placeOfSupply: 'placeOfSupply',
  shippingAddress: 'shippingAddress',
  shippingCharge: 'shippingCharge',
  additionalCharge: 'additionalCharge',
  saleDate: 'saleDate',
  salePrice: 'salePrice',
  usdPrice: 'usdPrice',
  taxAmount: 'taxAmount',
  discountAmount: 'discountAmount',
  netAmount: 'netAmount',
  paymentStatus: 'paymentStatus',
  paymentMethod: 'paymentMethod',
  platform: 'platform',
  notes: 'notes',
  invoiceId: 'invoiceId',
  legacyInvoiceId: 'legacyInvoiceId',
  costPriceSnapshot: 'costPriceSnapshot',
  profit: 'profit',
  actualProfit: 'actualProfit',
  internalShippingCost: 'internalShippingCost',
  internalPackagingCost: 'internalPackagingCost',
  internalInsuranceCost: 'internalInsuranceCost',
  internalHandlingCost: 'internalHandlingCost',
  internalOtherCharges: 'internalOtherCharges',
  internalCostTotal: 'internalCostTotal',
  listedSku: 'listedSku',
  fulfillmentSku: 'fulfillmentSku',
  fulfillmentReason: 'fulfillmentReason',
  marketplaceOrderItemId: 'marketplaceOrderItemId'
};

exports.Prisma.MemoScalarFieldEnum = {
  id: 'id',
  customerName: 'customerName',
  issueDate: 'issueDate',
  expiryDate: 'expiryDate',
  status: 'status',
  notes: 'notes'
};

exports.Prisma.MemoItemScalarFieldEnum = {
  id: 'id',
  memoId: 'memoId',
  inventoryId: 'inventoryId',
  status: 'status'
};

exports.Prisma.QuotationScalarFieldEnum = {
  id: 'id',
  quotationNumber: 'quotationNumber',
  token: 'token',
  customerId: 'customerId',
  customerName: 'customerName',
  customerEmail: 'customerEmail',
  customerMobile: 'customerMobile',
  customerAddress: 'customerAddress',
  customerCity: 'customerCity',
  status: 'status',
  totalAmount: 'totalAmount',
  validUntil: 'validUntil',
  expiryDate: 'expiryDate',
  notes: 'notes',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  approvedById: 'approvedById'
};

exports.Prisma.QuotationItemScalarFieldEnum = {
  id: 'id',
  quotationId: 'quotationId',
  inventoryId: 'inventoryId',
  quotedPrice: 'quotedPrice'
};

exports.Prisma.InvoiceScalarFieldEnum = {
  id: 'id',
  invoiceNumber: 'invoiceNumber',
  token: 'token',
  quotationId: 'quotationId',
  status: 'status',
  isActive: 'isActive',
  dueDate: 'dueDate',
  notes: 'notes',
  invoiceType: 'invoiceType',
  iecCode: 'iecCode',
  exportType: 'exportType',
  countryOfDestination: 'countryOfDestination',
  portOfDispatch: 'portOfDispatch',
  modeOfTransport: 'modeOfTransport',
  courierPartner: 'courierPartner',
  trackingId: 'trackingId',
  invoiceCurrency: 'invoiceCurrency',
  conversionRate: 'conversionRate',
  totalInrValue: 'totalInrValue',
  internalShippingCost: 'internalShippingCost',
  internalPackagingCost: 'internalPackagingCost',
  internalInsuranceCost: 'internalInsuranceCost',
  internalHandlingCost: 'internalHandlingCost',
  internalOtherCharges: 'internalOtherCharges',
  internalCostTotal: 'internalCostTotal',
  displayOptions: 'displayOptions',
  subtotal: 'subtotal',
  taxTotal: 'taxTotal',
  discountTotal: 'discountTotal',
  totalAmount: 'totalAmount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  paymentStatus: 'paymentStatus',
  paidAmount: 'paidAmount',
  invoiceDate: 'invoiceDate'
};

exports.Prisma.ExportInvoiceScalarFieldEnum = {
  id: 'id',
  invoiceId: 'invoiceId',
  customsDeclarationNumber: 'customsDeclarationNumber',
  fobValue: 'fobValue',
  freightCharges: 'freightCharges',
  insuranceCharges: 'insuranceCharges',
  shippingBillNumber: 'shippingBillNumber',
  portCode: 'portCode',
  hsnCodes: 'hsnCodes',
  buyerReference: 'buyerReference',
  contractNumber: 'contractNumber',
  preCarriageBy: 'preCarriageBy',
  preCarriagePort: 'preCarriagePort',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentScalarFieldEnum = {
  id: 'id',
  invoiceId: 'invoiceId',
  amount: 'amount',
  date: 'date',
  method: 'method',
  reference: 'reference',
  notes: 'notes',
  recordedBy: 'recordedBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryQrPaymentAuthorizationScalarFieldEnum = {
  id: 'id',
  inventoryId: 'inventoryId',
  enabled: 'enabled',
  totalAmount: 'totalAmount',
  amountToCollect: 'amountToCollect',
  currency: 'currency',
  allowPartial: 'allowPartial',
  paidAmount: 'paidAmount',
  customerName: 'customerName',
  customerEmail: 'customerEmail',
  customerPhone: 'customerPhone',
  orderReference: 'orderReference',
  saleId: 'saleId',
  updatedByUserId: 'updatedByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InventoryQrPaymentAttemptScalarFieldEnum = {
  id: 'id',
  authorizationId: 'authorizationId',
  inventoryId: 'inventoryId',
  amount: 'amount',
  currency: 'currency',
  status: 'status',
  razorpayOrderId: 'razorpayOrderId',
  razorpayPaymentId: 'razorpayPaymentId',
  activeKey: 'activeKey',
  failureReason: 'failureReason',
  createdAt: 'createdAt',
  paidAt: 'paidAt'
};

exports.Prisma.InvoiceVersionScalarFieldEnum = {
  id: 'id',
  invoiceId: 'invoiceId',
  versionNumber: 'versionNumber',
  reason: 'reason',
  snapshot: 'snapshot',
  createdAt: 'createdAt'
};

exports.Prisma.SettingScalarFieldEnum = {
  id: 'id',
  key: 'key',
  value: 'value',
  description: 'description',
  updatedAt: 'updatedAt'
};

exports.Prisma.CompanySettingsScalarFieldEnum = {
  id: 'id',
  companyName: 'companyName',
  invoicePrefix: 'invoicePrefix',
  invoicingStartNumber: 'invoicingStartNumber',
  invoiceLogoUrl: 'invoiceLogoUrl',
  quotationLogoUrl: 'quotationLogoUrl',
  logoUrl: 'logoUrl',
  skuViewLogoUrl: 'skuViewLogoUrl',
  otherDocsLogoUrl: 'otherDocsLogoUrl',
  address: 'address',
  email: 'email',
  phone: 'phone',
  website: 'website',
  gstin: 'gstin',
  enableExportInvoice: 'enableExportInvoice',
  defaultExportType: 'defaultExportType',
  companyIec: 'companyIec',
  defaultCurrency: 'defaultCurrency',
  defaultPort: 'defaultPort',
  swiftCode: 'swiftCode',
  termsAndConditions: 'termsAndConditions',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FollowUpScalarFieldEnum = {
  id: 'id',
  invoiceId: 'invoiceId',
  date: 'date',
  channel: 'channel',
  action: 'action',
  note: 'note',
  promisedDate: 'promisedDate',
  status: 'status',
  completedAt: 'completedAt',
  cancelledAt: 'cancelledAt',
  rescheduledTo: 'rescheduledTo',
  updatedAt: 'updatedAt',
  createdById: 'createdById',
  createdAt: 'createdAt'
};

exports.Prisma.SalesReturnScalarFieldEnum = {
  id: 'id',
  invoiceId: 'invoiceId',
  returnNumber: 'returnNumber',
  returnDate: 'returnDate',
  disposition: 'disposition',
  taxableAmount: 'taxableAmount',
  igst: 'igst',
  cgst: 'cgst',
  sgst: 'sgst',
  totalTax: 'totalTax',
  totalAmount: 'totalAmount',
  remarks: 'remarks',
  createdById: 'createdById',
  createdAt: 'createdAt'
};

exports.Prisma.SalesReturnItemScalarFieldEnum = {
  id: 'id',
  salesReturnId: 'salesReturnId',
  inventoryId: 'inventoryId',
  quantity: 'quantity',
  sellingPrice: 'sellingPrice',
  resaleable: 'resaleable'
};

exports.Prisma.CreditNoteScalarFieldEnum = {
  id: 'id',
  customerId: 'customerId',
  invoiceId: 'invoiceId',
  creditNoteNumber: 'creditNoteNumber',
  issueDate: 'issueDate',
  totalAmount: 'totalAmount',
  taxableAmount: 'taxableAmount',
  igst: 'igst',
  cgst: 'cgst',
  sgst: 'sgst',
  totalTax: 'totalTax',
  balanceAmount: 'balanceAmount',
  isActive: 'isActive',
  createdAt: 'createdAt'
};

exports.Prisma.InvoiceSettingsScalarFieldEnum = {
  id: 'id',
  prefix: 'prefix',
  currencySymbol: 'currencySymbol',
  digitalSignatureUrl: 'digitalSignatureUrl',
  terms: 'terms',
  exportTerms: 'exportTerms',
  footerNotes: 'footerNotes',
  gstEnabled: 'gstEnabled',
  gstType: 'gstType',
  categoryGstRates: 'categoryGstRates',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentSettingsScalarFieldEnum = {
  id: 'id',
  upiEnabled: 'upiEnabled',
  upiId: 'upiId',
  upiPayeeName: 'upiPayeeName',
  upiQrUrl: 'upiQrUrl',
  bankEnabled: 'bankEnabled',
  bankName: 'bankName',
  accountNumber: 'accountNumber',
  ifscCode: 'ifscCode',
  swiftCode: 'swiftCode',
  accountHolder: 'accountHolder',
  razorpayEnabled: 'razorpayEnabled',
  razorpayKeyId: 'razorpayKeyId',
  razorpayKeySecret: 'razorpayKeySecret',
  razorpayButtonId: 'razorpayButtonId',
  updatedAt: 'updatedAt'
};

exports.Prisma.ActivityLogScalarFieldEnum = {
  id: 'id',
  entityType: 'entityType',
  entityId: 'entityId',
  entityIdentifier: 'entityIdentifier',
  idempotencyKey: 'idempotencyKey',
  actionType: 'actionType',
  userId: 'userId',
  userName: 'userName',
  userEmail: 'userEmail',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  source: 'source',
  fieldChanges: 'fieldChanges',
  details: 'details',
  module: 'module',
  action: 'action',
  referenceId: 'referenceId',
  description: 'description',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.LabelPrintJobScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  layoutId: 'layoutId',
  printerId: 'printerId',
  status: 'status',
  printFormat: 'printFormat',
  totalItems: 'totalItems',
  createdAt: 'createdAt'
};

exports.Prisma.LabelPrintJobItemScalarFieldEnum = {
  id: 'id',
  jobId: 'jobId',
  sku: 'sku',
  sellingPrice: 'sellingPrice',
  priceWithChecksum: 'priceWithChecksum',
  checksumDigit: 'checksumDigit',
  checksumMethod: 'checksumMethod',
  encodingVersion: 'encodingVersion',
  internalName: 'internalName'
};

exports.Prisma.LabelCartItemScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  inventoryId: 'inventoryId',
  addedAt: 'addedAt'
};

exports.Prisma.PackagingCartItemScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  inventoryId: 'inventoryId',
  quantity: 'quantity',
  location: 'location',
  addedAt: 'addedAt'
};

exports.Prisma.SalesMarginAnalyticsScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  period: 'period',
  startDate: 'startDate',
  endDate: 'endDate',
  revenue: 'revenue',
  cost: 'cost',
  margin: 'margin',
  createdAt: 'createdAt'
};

exports.Prisma.ReportExportJobScalarFieldEnum = {
  id: 'id',
  reportType: 'reportType',
  format: 'format',
  dateFrom: 'dateFrom',
  dateTo: 'dateTo',
  filtersJson: 'filtersJson',
  status: 'status',
  requestedById: 'requestedById',
  requestedBy: 'requestedBy',
  downloadUrl: 'downloadUrl',
  errorMessage: 'errorMessage',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WorkerLockHeartbeatScalarFieldEnum = {
  id: 'id',
  ownerId: 'ownerId',
  leaseUntil: 'leaseUntil',
  heartbeatAt: 'heartbeatAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AnalyticsDailySnapshotScalarFieldEnum = {
  id: 'id',
  snapshotDate: 'snapshotDate',
  inventoryCount: 'inventoryCount',
  inventoryValueCost: 'inventoryValueCost',
  inventoryValueSell: 'inventoryValueSell',
  salesCount: 'salesCount',
  salesRevenue: 'salesRevenue',
  profitAmount: 'profitAmount',
  invoiceCount: 'invoiceCount',
  pendingInvoices: 'pendingInvoices',
  paymentReceived: 'paymentReceived',
  createdAt: 'createdAt'
};

exports.Prisma.AnalyticsInventorySnapshotScalarFieldEnum = {
  id: 'id',
  inventoryId: 'inventoryId',
  sku: 'sku',
  itemName: 'itemName',
  category: 'category',
  vendorName: 'vendorName',
  purchaseCost: 'purchaseCost',
  sellingPrice: 'sellingPrice',
  daysInStock: 'daysInStock',
  status: 'status',
  ageBucket: 'ageBucket',
  createdAt: 'createdAt'
};

exports.Prisma.AnalyticsVendorSnapshotScalarFieldEnum = {
  id: 'id',
  vendorId: 'vendorId',
  snapshotDate: 'snapshotDate',
  vendorName: 'vendorName',
  totalItemsSupplied: 'totalItemsSupplied',
  totalPurchaseValue: 'totalPurchaseValue',
  inventoryInStock: 'inventoryInStock',
  inventoryValue: 'inventoryValue',
  lastPurchaseDate: 'lastPurchaseDate',
  createdAt: 'createdAt'
};

exports.Prisma.AnalyticsSalesSnapshotScalarFieldEnum = {
  id: 'id',
  saleId: 'saleId',
  sku: 'sku',
  itemName: 'itemName',
  category: 'category',
  purchaseCost: 'purchaseCost',
  sellingPrice: 'sellingPrice',
  profitAmount: 'profitAmount',
  saleDate: 'saleDate',
  saleCycleDays: 'saleCycleDays',
  createdAt: 'createdAt'
};

exports.Prisma.AnalyticsLabelSnapshotScalarFieldEnum = {
  id: 'id',
  jobId: 'jobId',
  printedBy: 'printedBy',
  labelsPrinted: 'labelsPrinted',
  printedAt: 'printedAt',
  createdAt: 'createdAt'
};

exports.Prisma.PriceOverrideAuditScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  inventoryId: 'inventoryId',
  originalPrice: 'originalPrice',
  newPrice: 'newPrice',
  reason: 'reason',
  approvedBy: 'approvedBy',
  createdAt: 'createdAt'
};

exports.Prisma.DashboardNoteScalarFieldEnum = {
  id: 'id',
  content: 'content',
  color: 'color',
  position: 'position',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExpenseCategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  code: 'code',
  gstAllowed: 'gstAllowed',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.VoucherScalarFieldEnum = {
  id: 'id',
  voucherNumber: 'voucherNumber',
  voucherType: 'voucherType',
  voucherDate: 'voucherDate',
  referenceId: 'referenceId',
  narration: 'narration',
  amount: 'amount',
  isReversed: 'isReversed',
  reversalReason: 'reversalReason',
  createdById: 'createdById',
  createdAt: 'createdAt'
};

exports.Prisma.ExpenseScalarFieldEnum = {
  id: 'id',
  expenseDate: 'expenseDate',
  categoryId: 'categoryId',
  description: 'description',
  vendorName: 'vendorName',
  referenceNo: 'referenceNo',
  totalAmount: 'totalAmount',
  paymentMode: 'paymentMode',
  paymentStatus: 'paymentStatus',
  paidAmount: 'paidAmount',
  paymentDate: 'paymentDate',
  paymentRef: 'paymentRef',
  attachmentUrl: 'attachmentUrl',
  voucherId: 'voucherId',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AccountScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  type: 'type',
  subtype: 'subtype',
  description: 'description',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.JournalEntryScalarFieldEnum = {
  id: 'id',
  date: 'date',
  description: 'description',
  referenceType: 'referenceType',
  referenceId: 'referenceId',
  createdById: 'createdById',
  createdAt: 'createdAt',
  isReversed: 'isReversed'
};

exports.Prisma.JournalLineScalarFieldEnum = {
  id: 'id',
  journalEntryId: 'journalEntryId',
  accountId: 'accountId',
  debit: 'debit',
  credit: 'credit',
  description: 'description'
};

exports.Prisma.SerializedUnitScalarFieldEnum = {
  id: 'id',
  inventoryId: 'inventoryId',
  sku: 'sku',
  serialNumber: 'serialNumber',
  fullHash: 'fullHash',
  shortHash: 'shortHash',
  packagingStatus: 'packagingStatus',
  printCount: 'printCount',
  qrScanCount: 'qrScanCount',
  firstScanAt: 'firstScanAt',
  lastScanAt: 'lastScanAt',
  createdAt: 'createdAt',
  createdById: 'createdById',
  printedAt: 'printedAt',
  printedById: 'printedById',
  soldAt: 'soldAt',
  returnedAt: 'returnedAt',
  voidReason: 'voidReason',
  isActive: 'isActive'
};

exports.Prisma.SerialActivityLogScalarFieldEnum = {
  id: 'id',
  serialId: 'serialId',
  actionType: 'actionType',
  userId: 'userId',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  timestamp: 'timestamp',
  metadata: 'metadata'
};

exports.Prisma.GpisSettingsScalarFieldEnum = {
  id: 'id',
  brandName: 'brandName',
  tagline: 'tagline',
  estYear: 'estYear',
  registeredAddress: 'registeredAddress',
  gstin: 'gstin',
  iec: 'iec',
  supportEmail: 'supportEmail',
  supportPhone: 'supportPhone',
  supportTimings: 'supportTimings',
  website: 'website',
  categoryHsnJson: 'categoryHsnJson',
  showRegisteredAddress: 'showRegisteredAddress',
  showGstin: 'showGstin',
  showIec: 'showIec',
  showSupport: 'showSupport',
  showWatermark: 'showWatermark',
  watermarkText: 'watermarkText',
  watermarkOpacity: 'watermarkOpacity',
  watermarkRotation: 'watermarkRotation',
  watermarkFontSize: 'watermarkFontSize',
  watermarkFontFamily: 'watermarkFontFamily',
  labelFontFamily: 'labelFontFamily',
  microBorderText: 'microBorderText',
  toleranceCarat: 'toleranceCarat',
  toleranceGram: 'toleranceGram',
  labelVersion: 'labelVersion',
  logoUrl: 'logoUrl',
  careInstruction: 'careInstruction',
  legalMetrologyLine: 'legalMetrologyLine',
  updatedAt: 'updatedAt'
};

exports.Prisma.EbaySettingsScalarFieldEnum = {
  id: 'id',
  globalBannerImages: 'globalBannerImages',
  categoryImageUrls: 'categoryImageUrls',
  categoryGemtypeImageUrls: 'categoryGemtypeImageUrls',
  maxImagesPerCategory: 'maxImagesPerCategory',
  imagesPerDescription: 'imagesPerDescription',
  imageRotationMode: 'imageRotationMode',
  brandLogoUrl: 'brandLogoUrl',
  companyName: 'companyName',
  tagline: 'tagline',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GpisLayoutPresetScalarFieldEnum = {
  id: 'id',
  name: 'name',
  unit: 'unit',
  pageWidthMm: 'pageWidthMm',
  pageHeightMm: 'pageHeightMm',
  cols: 'cols',
  rows: 'rows',
  labelWidthMm: 'labelWidthMm',
  labelHeightMm: 'labelHeightMm',
  marginLeftMm: 'marginLeftMm',
  marginTopMm: 'marginTopMm',
  gapXmm: 'gapXmm',
  gapYmm: 'gapYmm',
  offsetXmm: 'offsetXmm',
  offsetYmm: 'offsetYmm',
  startPosition: 'startPosition',
  selectedFieldsJson: 'selectedFieldsJson',
  isDefault: 'isDefault',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GpisSerialScalarFieldEnum = {
  id: 'id',
  sku: 'sku',
  serialNumber: 'serialNumber',
  categoryCode: 'categoryCode',
  yearMonth: 'yearMonth',
  runningNumber: 'runningNumber',
  hashFragment: 'hashFragment',
  status: 'status',
  inventoryLocation: 'inventoryLocation',
  qcCode: 'qcCode',
  packedAt: 'packedAt',
  packingDate: 'packingDate',
  reprintCount: 'reprintCount',
  labelVersion: 'labelVersion',
  unitQuantity: 'unitQuantity',
  madeIn: 'madeIn',
  declaredOriginal: 'declaredOriginal',
  createdBy: 'createdBy',
  createdAt: 'createdAt'
};

exports.Prisma.GpisPrintJobScalarFieldEnum = {
  id: 'id',
  printJobId: 'printJobId',
  sku: 'sku',
  startSerial: 'startSerial',
  endSerial: 'endSerial',
  totalLabels: 'totalLabels',
  printerType: 'printerType',
  printedBy: 'printedBy',
  printedAt: 'printedAt',
  status: 'status',
  supersededById: 'supersededById',
  supersededAt: 'supersededAt'
};

exports.Prisma.GpisPrintJobItemScalarFieldEnum = {
  id: 'id',
  printJobId: 'printJobId',
  serialId: 'serialId',
  serialNumber: 'serialNumber',
  sku: 'sku',
  createdAt: 'createdAt'
};

exports.Prisma.GpisVerificationLogScalarFieldEnum = {
  id: 'id',
  serialNumber: 'serialNumber',
  scannedAt: 'scannedAt',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent'
};

exports.Prisma.CertificateCodeToInventoryScalarFieldEnum = {
  A: 'A',
  B: 'B'
};

exports.Prisma.InventoryToRashiCodeScalarFieldEnum = {
  A: 'A',
  B: 'B'
};

exports.Prisma.StateCodeScalarFieldEnum = {
  id: 'id',
  name: 'name',
  code: 'code',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PriceRecommendationLogScalarFieldEnum = {
  id: 'id',
  inventoryId: 'inventoryId',
  userId: 'userId',
  suggestedSellingRate: 'suggestedSellingRate',
  suggestedSellingPrice: 'suggestedSellingPrice',
  suggestedPurchaseRate: 'suggestedPurchaseRate',
  appliedSellingRate: 'appliedSellingRate',
  appliedSellingPrice: 'appliedSellingPrice',
  appliedPurchaseRate: 'appliedPurchaseRate',
  sellingDeviationPct: 'sellingDeviationPct',
  purchaseDeviationPct: 'purchaseDeviationPct',
  confidence: 'confidence',
  matchLevel: 'matchLevel',
  sampleCount: 'sampleCount',
  minRate: 'minRate',
  maxRate: 'maxRate',
  recommendationSnapshot: 'recommendationSnapshot',
  createdAt: 'createdAt'
};

exports.Prisma.MarketplaceProfileScalarFieldEnum = {
  id: 'id',
  name: 'name',
  displayName: 'displayName',
  currency: 'currency',
  isActive: 'isActive',
  isDefault: 'isDefault',
  marginType: 'marginType',
  marginValue: 'marginValue',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MarketplaceChargeScalarFieldEnum = {
  id: 'id',
  profileId: 'profileId',
  chargeKey: 'chargeKey',
  name: 'name',
  enabled: 'enabled',
  amountType: 'amountType',
  amount: 'amount',
  countryCode: 'countryCode',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CurrencyRateScalarFieldEnum = {
  id: 'id',
  code: 'code',
  rateToInr: 'rateToInr',
  isBase: 'isBase',
  updatedAt: 'updatedAt'
};

exports.Prisma.MarketplaceConnectionScalarFieldEnum = {
  id: 'id',
  marketplace: 'marketplace',
  externalAccountId: 'externalAccountId',
  name: 'name',
  authType: 'authType',
  oauthAppProfile: 'oauthAppProfile',
  clientId: 'clientId',
  tokenRef: 'tokenRef',
  status: 'status',
  scopes: 'scopes',
  lastConnectedAt: 'lastConnectedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MarketplaceShopScalarFieldEnum = {
  id: 'id',
  connectionId: 'connectionId',
  marketplace: 'marketplace',
  externalShopId: 'externalShopId',
  name: 'name',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MarketplaceSyncLogScalarFieldEnum = {
  id: 'id',
  marketplace: 'marketplace',
  syncType: 'syncType',
  status: 'status',
  startedAt: 'startedAt',
  endedAt: 'endedAt',
  recordsScanned: 'recordsScanned',
  recordsCreated: 'recordsCreated',
  recordsUpdated: 'recordsUpdated',
  recordsSkipped: 'recordsSkipped',
  recordsFailed: 'recordsFailed',
  errorDetails: 'errorDetails',
  triggeredBy: 'triggeredBy',
  marketplaceShopId: 'marketplaceShopId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MarketplaceSyncJobScalarFieldEnum = {
  id: 'id',
  marketplaceShopId: 'marketplaceShopId',
  syncType: 'syncType',
  status: 'status',
  progressStep: 'progressStep',
  progressDetail: 'progressDetail',
  cursor: 'cursor',
  recordsScanned: 'recordsScanned',
  recordsCreated: 'recordsCreated',
  recordsUpdated: 'recordsUpdated',
  recordsSkipped: 'recordsSkipped',
  recordsFailed: 'recordsFailed',
  attempts: 'attempts',
  errorDetails: 'errorDetails',
  requestedById: 'requestedById',
  requestedBy: 'requestedBy',
  batchId: 'batchId',
  startedAt: 'startedAt',
  endedAt: 'endedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EbayWebhookNotificationScalarFieldEnum = {
  id: 'id',
  notificationId: 'notificationId',
  topic: 'topic',
  ebayUserId: 'ebayUserId',
  ebayUsername: 'ebayUsername',
  signatureValid: 'signatureValid',
  status: 'status',
  receivedAt: 'receivedAt',
  processedAt: 'processedAt',
  errorDetails: 'errorDetails'
};

exports.Prisma.MarketplaceOrderScalarFieldEnum = {
  id: 'id',
  marketplace: 'marketplace',
  marketplaceOrderId: 'marketplaceOrderId',
  orderNumber: 'orderNumber',
  marketplaceShopName: 'marketplaceShopName',
  marketplaceShopId: 'marketplaceShopId',
  status: 'status',
  buyerName: 'buyerName',
  buyerEmail: 'buyerEmail',
  buyerCountry: 'buyerCountry',
  buyerCity: 'buyerCity',
  buyerState: 'buyerState',
  buyerZip: 'buyerZip',
  trackingCode: 'trackingCode',
  carrier: 'carrier',
  orderTotal: 'orderTotal',
  currency: 'currency',
  orderDate: 'orderDate',
  rawMetadata: 'rawMetadata',
  lastSyncedAt: 'lastSyncedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MarketplaceOrderItemScalarFieldEnum = {
  id: 'id',
  orderId: 'orderId',
  marketplaceItemId: 'marketplaceItemId',
  listedSku: 'listedSku',
  listedTitle: 'listedTitle',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  currency: 'currency',
  fulfillmentSku: 'fulfillmentSku',
  fulfillmentReason: 'fulfillmentReason',
  inventoryId: 'inventoryId',
  status: 'status',
  rawMetadata: 'rawMetadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DocumentScalarFieldEnum = {
  id: 'id',
  customerId: 'customerId',
  orderId: 'orderId',
  saleId: 'saleId',
  invoiceId: 'invoiceId',
  type: 'type',
  fileName: 'fileName',
  mimeType: 'mimeType',
  sizeBytes: 'sizeBytes',
  storageProvider: 'storageProvider',
  storageRef: 'storageRef',
  certificateNumber: 'certificateNumber',
  status: 'status',
  errorMessage: 'errorMessage',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EmailLogScalarFieldEnum = {
  id: 'id',
  customerId: 'customerId',
  orderId: 'orderId',
  templateKey: 'templateKey',
  recipient: 'recipient',
  cc: 'cc',
  bcc: 'bcc',
  subject: 'subject',
  bodyRef: 'bodyRef',
  bodyHtml: 'bodyHtml',
  bodyText: 'bodyText',
  payloadJson: 'payloadJson',
  retryHistoryJson: 'retryHistoryJson',
  idempotencyKey: 'idempotencyKey',
  threadId: 'threadId',
  messageId: 'messageId',
  inReplyTo: 'inReplyTo',
  referencesJson: 'referencesJson',
  emailType: 'emailType',
  direction: 'direction',
  provider: 'provider',
  providerMessageId: 'providerMessageId',
  status: 'status',
  attemptCount: 'attemptCount',
  lastAttemptAt: 'lastAttemptAt',
  nextRetryAt: 'nextRetryAt',
  lastError: 'lastError',
  failureCode: 'failureCode',
  processingStartedAt: 'processingStartedAt',
  queuedAt: 'queuedAt',
  sentAt: 'sentAt',
  deliveredAt: 'deliveredAt',
  openedAt: 'openedAt',
  bouncedAt: 'bouncedAt',
  failedAt: 'failedAt',
  cancelledAt: 'cancelledAt',
  isRead: 'isRead',
  readAt: 'readAt',
  errorMessage: 'errorMessage',
  attachmentsJson: 'attachmentsJson',
  receivedAt: 'receivedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EmailProviderEventScalarFieldEnum = {
  id: 'id',
  eventId: 'eventId',
  communicationId: 'communicationId',
  providerMessageId: 'providerMessageId',
  eventType: 'eventType',
  occurredAt: 'occurredAt',
  receivedAt: 'receivedAt'
};

exports.Prisma.WorkSessionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  platform: 'platform',
  activityType: 'activityType',
  description: 'description',
  sku: 'sku',
  marketplaceListingId: 'marketplaceListingId',
  inventoryId: 'inventoryId',
  marketplaceShopId: 'marketplaceShopId',
  listingRecordId: 'listingRecordId',
  startedAt: 'startedAt',
  endedAt: 'endedAt',
  durationSeconds: 'durationSeconds',
  status: 'status',
  trackingSource: 'trackingSource',
  notes: 'notes',
  requestId: 'requestId',
  activeUserId: 'activeUserId',
  revision: 'revision',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WorkIntervalScalarFieldEnum = {
  id: 'id',
  sessionId: 'sessionId',
  startedAt: 'startedAt',
  endedAt: 'endedAt'
};

exports.Prisma.WorkTargetScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  platform: 'platform',
  period: 'period',
  targetMinutes: 'targetMinutes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WorkActivityEventScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  platform: 'platform',
  domain: 'domain',
  eventType: 'eventType',
  occurredAt: 'occurredAt',
  durationSeconds: 'durationSeconds',
  source: 'source',
  sessionId: 'sessionId',
  createdAt: 'createdAt'
};

exports.Prisma.WorkTrackerCredentialScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  name: 'name',
  tokenHash: 'tokenHash',
  expiresAt: 'expiresAt',
  revokedAt: 'revokedAt',
  createdAt: 'createdAt'
};

exports.Prisma.WeeklyReportRunScalarFieldEnum = {
  id: 'id',
  executionKey: 'executionKey',
  mode: 'mode',
  status: 'status',
  periodStart: 'periodStart',
  periodEnd: 'periodEnd',
  timezone: 'timezone',
  scheduledFor: 'scheduledFor',
  configHash: 'configHash',
  settingsJson: 'settingsJson',
  metricsJson: 'metricsJson',
  dataQuality: 'dataQuality',
  pdfBase64: 'pdfBase64',
  pdfChecksum: 'pdfChecksum',
  pdfBytes: 'pdfBytes',
  attempts: 'attempts',
  leaseOwner: 'leaseOwner',
  leaseUntil: 'leaseUntil',
  nextAttemptAt: 'nextAttemptAt',
  requestedById: 'requestedById',
  errorCode: 'errorCode',
  errorSummary: 'errorSummary',
  startedAt: 'startedAt',
  completedAt: 'completedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WeeklyReportDeliveryScalarFieldEnum = {
  id: 'id',
  runId: 'runId',
  recipient: 'recipient',
  status: 'status',
  attempts: 'attempts',
  attemptedAt: 'attemptedAt',
  acceptedAt: 'acceptedAt',
  nextAttemptAt: 'nextAttemptAt',
  providerMessageId: 'providerMessageId',
  emailLogId: 'emailLogId',
  errorCode: 'errorCode',
  errorSummary: 'errorSummary',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  User: 'User',
  Notification: 'Notification',
  Permission: 'Permission',
  Role: 'Role',
  RolePermission: 'RolePermission',
  UserPermission: 'UserPermission',
  InventoryMetrics: 'InventoryMetrics',
  LandingPageSettings: 'LandingPageSettings',
  LandingPageVersion: 'LandingPageVersion',
  WhatsNewEntry: 'WhatsNewEntry',
  CategoryCode: 'CategoryCode',
  GemstoneCode: 'GemstoneCode',
  ColorCode: 'ColorCode',
  CutCode: 'CutCode',
  ShapeCode: 'ShapeCode',
  CollectionCode: 'CollectionCode',
  RashiCode: 'RashiCode',
  CertificateCode: 'CertificateCode',
  Vendor: 'Vendor',
  Customer: 'Customer',
  CustomerAdvance: 'CustomerAdvance',
  CustomerAdvanceAdjustment: 'CustomerAdvanceAdjustment',
  Inventory: 'Inventory',
  InventoryPair: 'InventoryPair',
  InventorySet: 'InventorySet',
  InventorySetItem: 'InventorySetItem',
  InventoryMedia: 'InventoryMedia',
  Purchase: 'Purchase',
  PurchaseItem: 'PurchaseItem',
  PurchasePayment: 'PurchasePayment',
  Listing: 'Listing',
  ListingPriceHistory: 'ListingPriceHistory',
  ListingMetricSnapshot: 'ListingMetricSnapshot',
  ListingOpportunity: 'ListingOpportunity',
  Sale: 'Sale',
  Memo: 'Memo',
  MemoItem: 'MemoItem',
  Quotation: 'Quotation',
  QuotationItem: 'QuotationItem',
  Invoice: 'Invoice',
  ExportInvoice: 'ExportInvoice',
  Payment: 'Payment',
  InventoryQrPaymentAuthorization: 'InventoryQrPaymentAuthorization',
  InventoryQrPaymentAttempt: 'InventoryQrPaymentAttempt',
  InvoiceVersion: 'InvoiceVersion',
  Setting: 'Setting',
  CompanySettings: 'CompanySettings',
  FollowUp: 'FollowUp',
  SalesReturn: 'SalesReturn',
  SalesReturnItem: 'SalesReturnItem',
  CreditNote: 'CreditNote',
  InvoiceSettings: 'InvoiceSettings',
  PaymentSettings: 'PaymentSettings',
  ActivityLog: 'ActivityLog',
  LabelPrintJob: 'LabelPrintJob',
  LabelPrintJobItem: 'LabelPrintJobItem',
  LabelCartItem: 'LabelCartItem',
  PackagingCartItem: 'PackagingCartItem',
  SalesMarginAnalytics: 'SalesMarginAnalytics',
  ReportExportJob: 'ReportExportJob',
  WorkerLockHeartbeat: 'WorkerLockHeartbeat',
  AnalyticsDailySnapshot: 'AnalyticsDailySnapshot',
  AnalyticsInventorySnapshot: 'AnalyticsInventorySnapshot',
  AnalyticsVendorSnapshot: 'AnalyticsVendorSnapshot',
  AnalyticsSalesSnapshot: 'AnalyticsSalesSnapshot',
  AnalyticsLabelSnapshot: 'AnalyticsLabelSnapshot',
  PriceOverrideAudit: 'PriceOverrideAudit',
  DashboardNote: 'DashboardNote',
  ExpenseCategory: 'ExpenseCategory',
  Voucher: 'Voucher',
  Expense: 'Expense',
  Account: 'Account',
  JournalEntry: 'JournalEntry',
  JournalLine: 'JournalLine',
  SerializedUnit: 'SerializedUnit',
  SerialActivityLog: 'SerialActivityLog',
  GpisSettings: 'GpisSettings',
  EbaySettings: 'EbaySettings',
  GpisLayoutPreset: 'GpisLayoutPreset',
  GpisSerial: 'GpisSerial',
  GpisPrintJob: 'GpisPrintJob',
  GpisPrintJobItem: 'GpisPrintJobItem',
  GpisVerificationLog: 'GpisVerificationLog',
  CertificateCodeToInventory: 'CertificateCodeToInventory',
  InventoryToRashiCode: 'InventoryToRashiCode',
  StateCode: 'StateCode',
  PriceRecommendationLog: 'PriceRecommendationLog',
  MarketplaceProfile: 'MarketplaceProfile',
  MarketplaceCharge: 'MarketplaceCharge',
  CurrencyRate: 'CurrencyRate',
  MarketplaceConnection: 'MarketplaceConnection',
  MarketplaceShop: 'MarketplaceShop',
  MarketplaceSyncLog: 'MarketplaceSyncLog',
  MarketplaceSyncJob: 'MarketplaceSyncJob',
  EbayWebhookNotification: 'EbayWebhookNotification',
  MarketplaceOrder: 'MarketplaceOrder',
  MarketplaceOrderItem: 'MarketplaceOrderItem',
  Document: 'Document',
  EmailLog: 'EmailLog',
  EmailProviderEvent: 'EmailProviderEvent',
  WorkSession: 'WorkSession',
  WorkInterval: 'WorkInterval',
  WorkTarget: 'WorkTarget',
  WorkActivityEvent: 'WorkActivityEvent',
  WorkTrackerCredential: 'WorkTrackerCredential',
  WeeklyReportRun: 'WeeklyReportRun',
  WeeklyReportDelivery: 'WeeklyReportDelivery'
};
/**
 * Create the Client
 */
const config = {
  "generator": {
    "name": "client",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client-js"
    },
    "output": {
      "value": "D:\\Tools by Akansh\\khyatigems-erp\\.codex-prisma-gen-tmp\\client",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "windows",
        "native": true
      }
    ],
    "previewFeatures": [
      "driverAdapters"
    ],
    "sourceFilePath": "D:\\Tools by Akansh\\khyatigems-erp\\.codex-prisma-gen-tmp\\schema.prisma",
    "isCustomOutput": true
  },
  "relativeEnvPaths": {
    "rootEnvPath": "../../.env",
    "schemaEnvPath": "../../.env"
  },
  "relativePath": "..",
  "clientVersion": "5.22.0",
  "engineVersion": "605197351a3c8bdd595af2d2a9bc3025bca48ea2",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "sqlite",
  "postinstall": false,
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": "DATABASE_URL",
        "value": null
      }
    }
  },
  "inlineSchema": "generator client {\n  output          = \"./client\"\n  provider        = \"prisma-client-js\"\n  previewFeatures = [\"driverAdapters\"]\n}\n\ndatasource db {\n  provider     = \"sqlite\"\n  url          = env(\"DATABASE_URL\")\n  relationMode = \"prisma\"\n}\n\nmodel User {\n  id                 String    @id @default(uuid())\n  name               String\n  email              String    @unique\n  password           String\n  role               String\n  roleId             String?\n  avatar             String?\n  avatarUrl          String?\n  avatarHistory      String?   @default(\"[]\")\n  themePreference    String?   @default(\"default\")\n  premiumMode        Boolean?  @default(false)\n  lastLogin          DateTime?\n  lastPasswordChange DateTime?\n  forceLogoutBefore  DateTime?\n  createdAt          DateTime  @default(now())\n\n  workSessions           WorkSession[]\n  workTargets            WorkTarget[]\n  workActivityEvents     WorkActivityEvent[]\n  workTrackerCredentials WorkTrackerCredential[]\n  notifications          Notification[]\n\n  roleRelation               Role?                  @relation(fields: [roleId], references: [id])\n  userPermissions            UserPermission[]\n  labelCartItems             LabelCartItem[]\n  packagingCartItems         PackagingCartItem[]\n  labelPrintJobs             LabelPrintJob[]\n  createdLandingPageVersions LandingPageVersion[]\n  createdQuotations          Quotation[]            @relation(\"CreatedQuotations\")\n  createdSerials             SerializedUnit[]       @relation(\"CreatedSerials\")\n  printedSerials             SerializedUnit[]       @relation(\"PrintedSerials\")\n  approvedQuotations         Quotation[]            @relation(\"ApprovedQuotations\")\n  marginAnalytics            SalesMarginAnalytics[]\n  priceOverrides             PriceOverrideAudit[]\n  dashboardNotes             DashboardNote[]\n  expenses                   Expense[]\n  vouchers                   Voucher[]\n  journalEntries             JournalEntry[]\n  followUps                  FollowUp[]\n  createdPairs               InventoryPair[]        @relation(\"PairCreatedBy\")\n  confirmedPairs             InventoryPair[]        @relation(\"PairConfirmedBy\")\n  createdSets                InventorySet[]         @relation(\"SetCreatedBy\")\n  confirmedSets              InventorySet[]         @relation(\"SetConfirmedBy\")\n\n  @@index([roleId])\n}\n\nmodel Notification {\n  id        String    @id @default(uuid())\n  userId    String\n  eventKey  String\n  type      String    @default(\"info\")\n  title     String\n  message   String\n  href      String?\n  readAt    DateTime?\n  createdAt DateTime  @default(now())\n  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  @@unique([userId, eventKey])\n  @@index([userId, readAt, createdAt])\n}\n\nmodel Permission {\n  id          String   @id @default(uuid())\n  module      String\n  action      String\n  key         String   @unique\n  description String?\n  createdAt   DateTime @default(now())\n  updatedAt   DateTime @updatedAt\n\n  rolePermissions RolePermission[]\n  userPermissions UserPermission[]\n}\n\nmodel Role {\n  id        String   @id @default(uuid())\n  name      String   @unique\n  isSystem  Boolean  @default(false)\n  isActive  Boolean  @default(true)\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  users       User[]\n  permissions RolePermission[]\n}\n\nmodel RolePermission {\n  id           String @id @default(uuid())\n  roleId       String\n  permissionId String\n\n  role       Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)\n  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)\n\n  @@unique([roleId, permissionId])\n  @@index([roleId])\n  @@index([permissionId])\n}\n\nmodel UserPermission {\n  id           String  @id @default(uuid())\n  userId       String\n  permissionId String\n  allow        Boolean\n\n  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)\n  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)\n\n  @@unique([userId, permissionId])\n  @@index([userId])\n  @@index([permissionId])\n}\n\nmodel InventoryMetrics {\n  inventoryId String   @id\n  daysInStock Int\n  memoDays    Int?\n  lastUpdated DateTime @updatedAt\n}\n\nmodel LandingPageSettings {\n  id                String    @id @default(uuid())\n  brandTitle        String    @default(\"KhyatiGems™ ERP\")\n  subtitle          String    @default(\"Internal Operations & Management Platform\")\n  accessNotice      String    @default(\"Authorized internal access only\")\n  highlightsEnabled Boolean   @default(true)\n  whatsNewEnabled   Boolean   @default(false)\n  highlights        String    @default(\"[]\")\n  whatsNewText      String?\n  whatsNewUpdatedAt DateTime?\n  activeVersion     Int       @default(1)\n  updatedByUserId   String\n  updatedAt         DateTime  @updatedAt\n}\n\nmodel LandingPageVersion {\n  id              String   @id @default(uuid())\n  versionNumber   Int\n  snapshot        String\n  createdByUserId String\n  createdAt       DateTime @default(now())\n  isRollback      Boolean  @default(false)\n  createdBy       User     @relation(fields: [createdByUserId], references: [id])\n\n  @@index([createdByUserId])\n}\n\nmodel WhatsNewEntry {\n  id        String   @id @default(uuid())\n  message   String\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n}\n\nmodel CategoryCode {\n  id          String      @id @default(uuid())\n  name        String      @unique\n  code        String      @unique\n  status      String      @default(\"ACTIVE\")\n  createdAt   DateTime    @default(now())\n  updatedAt   DateTime    @updatedAt\n  inventories Inventory[]\n}\n\nmodel GemstoneCode {\n  id          String      @id @default(uuid())\n  name        String      @unique\n  code        String      @unique\n  status      String      @default(\"ACTIVE\")\n  createdAt   DateTime    @default(now())\n  updatedAt   DateTime    @updatedAt\n  inventories Inventory[]\n}\n\nmodel ColorCode {\n  id          String      @id @default(uuid())\n  name        String      @unique\n  code        String      @unique\n  status      String      @default(\"ACTIVE\")\n  createdAt   DateTime    @default(now())\n  updatedAt   DateTime    @updatedAt\n  inventories Inventory[]\n}\n\nmodel CutCode {\n  id          String      @id @default(uuid())\n  name        String      @unique\n  code        String      @unique\n  status      String      @default(\"ACTIVE\")\n  createdAt   DateTime    @default(now())\n  updatedAt   DateTime    @updatedAt\n  inventories Inventory[]\n}\n\nmodel ShapeCode {\n  id        String   @id @default(uuid())\n  name      String   @unique\n  code      String   @unique\n  status    String   @default(\"ACTIVE\")\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n}\n\nmodel CollectionCode {\n  id          String      @id @default(uuid())\n  name        String      @unique\n  code        String      @unique\n  status      String      @default(\"ACTIVE\")\n  createdAt   DateTime    @default(now())\n  updatedAt   DateTime    @updatedAt\n  inventories Inventory[]\n}\n\nmodel RashiCode {\n  id          String      @id @default(uuid())\n  name        String      @unique\n  code        String      @unique\n  status      String      @default(\"ACTIVE\")\n  createdAt   DateTime    @default(now())\n  updatedAt   DateTime    @updatedAt\n  inventories Inventory[]\n}\n\nmodel CertificateCode {\n  id          String      @id @default(uuid())\n  name        String      @unique\n  code        String      @unique\n  remarks     String?\n  status      String      @default(\"ACTIVE\")\n  createdAt   DateTime    @default(now())\n  updatedAt   DateTime    @updatedAt\n  inventories Inventory[]\n}\n\nmodel Vendor {\n  id          String      @id @default(uuid())\n  name        String      @unique\n  phone       String?\n  email       String?\n  address     String?\n  city        String?\n  state       String?\n  country     String?\n  vendorType  String?\n  gstin       String?\n  pan         String?\n  notes       String?\n  status      String      @default(\"PENDING\")\n  createdAt   DateTime    @default(now())\n  updatedAt   DateTime    @updatedAt\n  purchases   Purchase[]\n  inventories Inventory[]\n\n  @@index([status])\n}\n\nmodel Customer {\n  id                  String            @id @default(uuid())\n  name                String\n  email               String?\n  phone               String?\n  phoneSecondary      String?\n  address             String?\n  city                String?\n  state               String?\n  country             String?\n  pincode             String?\n  pan                 String?\n  gstin               String?\n  notes               String?\n  customerType        String?           @default(\"Retail\")\n  assignedSalesperson String?\n  interestedIn        String?\n  budgetRange         String?\n  whatsappNumber      String?\n  preferredContact    String?\n  createdAt           DateTime          @default(now())\n  updatedAt           DateTime          @updatedAt\n  stateCode           String?\n  countryCode         String?\n  isInternational     Boolean           @default(false)\n  quotations          Quotation[]\n  sales               Sale[]\n  creditNotes         CreditNote[]\n  advances            CustomerAdvance[]\n}\n\nmodel CustomerAdvance {\n  id              String   @id @default(uuid())\n  customerId      String\n  customer        Customer @relation(fields: [customerId], references: [id])\n  amount          Float\n  paymentMode     String   @default(\"CASH\")\n  paymentRef      String?\n  notes           String?\n  isAdjusted      Boolean  @default(false)\n  adjustedAmount  Float    @default(0)\n  remainingAmount Float\n  createdAt       DateTime @default(now())\n  updatedAt       DateTime @updatedAt\n\n  adjustments CustomerAdvanceAdjustment[]\n\n  @@index([customerId])\n}\n\nmodel CustomerAdvanceAdjustment {\n  id         String          @id @default(uuid())\n  advanceId  String\n  advance    CustomerAdvance @relation(fields: [advanceId], references: [id])\n  saleId     String\n  sale       Sale            @relation(fields: [saleId], references: [id])\n  amountUsed Float\n  createdAt  DateTime        @default(now())\n\n  @@index([advanceId])\n  @@index([saleId])\n}\n\nmodel Inventory {\n  id                   String                  @id @default(uuid())\n  sku                  String                  @unique\n  itemName             String\n  internalName         String?\n  category             String\n  gemType              String?\n  stoneType            String?                 @map(\"stone_type\")\n  description          String?\n  productDescription   String?\n  etsyDescription      String?\n  pieces               Int                     @default(1)\n  weightValue          Float?                  @default(0)\n  weightUnit           String?\n  carats               Float                   @default(0)\n  weightRatti          Float?\n  weightGrams          Float?                  @map(\"weight_grams\")\n  costPrice            Float\n  sellingPrice         Float\n  profit               Float?\n  condition            String                  @default(\"New\")\n  status               String                  @default(\"IN_STOCK\")\n  hideFromAttention    Boolean                 @default(false)\n  location             String?\n  certificateNo        String?\n  certificateNumber    String?                 @map(\"certificate_number\")\n  certification        String?\n  lab                  String?\n  certificateLab       String?                 @map(\"certificate_lab\")\n  shape                String?\n  color                String?\n  clarity              String?\n  clarityGrade         String?                 @map(\"clarity_grade\")\n  cut                  String?\n  cutGrade             String?                 @map(\"cut_grade\")\n  polish               String?\n  symmetry             String?\n  fluorescence         String?\n  measurements         String?\n  dimensionsMm         String?\n  tablePercent         Float?\n  depthPercent         Float?\n  ratio                Float?\n  origin               String?\n  originCountry        String?                 @map(\"origin_country\")\n  treatment            String?\n  cutPolishedIn        String?                 @default(\"India\") @map(\"cut_polished_in\")\n  qcCode               String?                 @map(\"qc_code\")\n  hsnCode              String?                 @map(\"hsn_code\")\n  transparency         String?\n  braceletType         String?\n  standardSize         String?\n  beadSizeMm           Float?\n  beadSizeLabel        String?                 @map(\"bead_size_label\")\n  beadCount            Int?\n  holeSizeMm           Float?\n  innerCircumferenceMm Float?\n  pricingMode          String                  @default(\"FIXED\")\n  sellingRatePerCarat  Float?\n  flatSellingPrice     Float?\n  purchaseRatePerCarat Float?\n  flatPurchaseCost     Float?\n  notes                String?\n  certificateComments  String?\n  stockLocation        String?\n  salesReturnItems     SalesReturnItem[]\n  purchaseId           String?\n  vendorId             String?\n  batchId              String?\n  imageUrl             String?\n  videoUrl             String?\n  rapPrice             Float?                  @default(0)\n  discountPercent      Float?                  @default(0)\n  createdAt            DateTime                @default(now())\n  updatedAt            DateTime                @updatedAt\n  categoryCodeId       String?\n  gemstoneCodeId       String?\n  colorCodeId          String?\n  cutCodeId            String?\n  collectionCodeId     String?\n  categoryCode         CategoryCode?           @relation(fields: [categoryCodeId], references: [id])\n  gemstoneCode         GemstoneCode?           @relation(fields: [gemstoneCodeId], references: [id])\n  colorCode            ColorCode?              @relation(fields: [colorCodeId], references: [id])\n  cutCode              CutCode?                @relation(fields: [cutCodeId], references: [id])\n  collectionCode       CollectionCode?         @relation(fields: [collectionCodeId], references: [id])\n  rashis               RashiCode[]\n  certificates         CertificateCode[]\n  media                InventoryMedia[]\n  purchase             Purchase?               @relation(fields: [purchaseId], references: [id])\n  vendor               Vendor?                 @relation(fields: [vendorId], references: [id])\n  listings             Listing[]\n  metricSnapshots      ListingMetricSnapshot[]\n  opportunities        ListingOpportunity[]\n  sales                Sale[]\n  memoItems            MemoItem[]\n  quotationItems       QuotationItem[]\n  labelCartItems       LabelCartItem[]\n  packagingCartItems   PackagingCartItem[]\n  serializedUnits      SerializedUnit[]\n  pairsAsA             InventoryPair[]         @relation(\"PairA\")\n  pairsAsB             InventoryPair[]         @relation(\"PairB\")\n  setItems             InventorySetItem[]\n\n  @@index([purchaseId])\n  @@index([status])\n  @@index([vendorId])\n  @@index([category])\n  @@index([categoryCodeId])\n  @@index([gemstoneCodeId])\n  @@index([colorCodeId])\n  @@index([cutCodeId])\n  @@index([collectionCodeId])\n  // Performance indexes for common queries\n  @@index([createdAt])\n  @@index([updatedAt])\n  @@index([status, createdAt])\n  @@index([gemType])\n  @@index([color])\n  @@index([weightValue])\n  @@index([itemName])\n  @@index([status, category])\n  @@index([status, gemType])\n  @@index([status, color])\n  @@index([status, vendorId])\n  @@index([gemstoneCodeId, weightValue, status])\n  // Matched pairs/set indexes\n  @@index([status, gemType, color, shape, carats])\n  @@index([status, gemType, clarity, cut, carats])\n}\n\nmodel InventoryPair {\n  id             String    @id @default(uuid())\n  inventoryIdA   String\n  inventoryIdB   String\n  matchType      String    @default(\"PAIR\") // PAIR | SET_3 | SET_4\n  score          Int\n  matchDetails   String\n  status         String    @default(\"SUGGESTED\") // SUGGESTED | CONFIRMED | REJECTED | SOLD_AS_PAIR\n  suggestedPrice Float?\n  createdById    String?\n  confirmedById  String?\n  createdAt      DateTime  @default(now())\n  confirmedAt    DateTime?\n  soldAt         DateTime?\n\n  inventoryA  Inventory @relation(\"PairA\", fields: [inventoryIdA], references: [id], onDelete: Cascade)\n  inventoryB  Inventory @relation(\"PairB\", fields: [inventoryIdB], references: [id], onDelete: Cascade)\n  createdBy   User?     @relation(\"PairCreatedBy\", fields: [createdById], references: [id])\n  confirmedBy User?     @relation(\"PairConfirmedBy\", fields: [confirmedById], references: [id])\n\n  @@unique([inventoryIdA, inventoryIdB])\n  @@index([inventoryIdA])\n  @@index([inventoryIdB])\n  @@index([status])\n  @@index([matchType])\n  @@index([createdAt])\n}\n\nmodel InventorySet {\n  id             String    @id @default(uuid())\n  name           String?\n  matchType      String // SET_3 | SET_4\n  itemCount      Int\n  score          Int\n  matchDetails   String\n  status         String    @default(\"SUGGESTED\")\n  suggestedPrice Float?\n  createdById    String?\n  confirmedById  String?\n  createdAt      DateTime  @default(now())\n  confirmedAt    DateTime?\n  soldAt         DateTime?\n\n  items       InventorySetItem[]\n  createdBy   User?              @relation(\"SetCreatedBy\", fields: [createdById], references: [id])\n  confirmedBy User?              @relation(\"SetConfirmedBy\", fields: [confirmedById], references: [id])\n\n  @@index([status])\n  @@index([matchType])\n  @@index([createdAt])\n}\n\nmodel InventorySetItem {\n  id          String       @id @default(uuid())\n  setId       String\n  inventoryId String\n  position    Int\n  set         InventorySet @relation(fields: [setId], references: [id], onDelete: Cascade)\n  inventory   Inventory    @relation(fields: [inventoryId], references: [id], onDelete: Cascade)\n\n  @@unique([setId, position])\n  @@index([inventoryId])\n}\n\nmodel InventoryMedia {\n  id          String    @id @default(uuid())\n  inventoryId String\n  mediaUrl    String\n  type        String\n  isPrimary   Boolean   @default(false)\n  createdAt   DateTime  @default(now())\n  inventory   Inventory @relation(fields: [inventoryId], references: [id], onDelete: Cascade)\n\n  @@index([inventoryId])\n}\n\nmodel Purchase {\n  id            String            @id @default(uuid())\n  invoiceNo     String?           @unique\n  purchaseDate  DateTime\n  vendorId      String?\n  totalAmount   Float\n  paymentStatus String            @default(\"PENDING\")\n  paymentMode   String?\n  notes         String?\n  createdAt     DateTime          @default(now())\n  updatedAt     DateTime          @updatedAt\n  items         Inventory[]\n  vendor        Vendor?           @relation(fields: [vendorId], references: [id])\n  purchaseItems PurchaseItem[]\n  payments      PurchasePayment[]\n\n  @@index([vendorId])\n}\n\nmodel PurchaseItem {\n  id          String   @id @default(uuid())\n  purchaseId  String\n  itemName    String\n  category    String\n  shape       String?\n  dimensions  String?\n  beadSizeMm  Float?\n  weightValue Float\n  weightUnit  String\n  quantity    Float    @default(1)\n  unitCost    Float\n  totalCost   Float\n  notes       String?\n  purchase    Purchase @relation(fields: [purchaseId], references: [id], onDelete: Cascade)\n\n  @@index([purchaseId])\n}\n\nmodel PurchasePayment {\n  id           String    @id @default(uuid())\n  purchaseId   String\n  amount       Float\n  date         DateTime  @default(now())\n  method       String\n  reference    String?\n  chequeNumber String?\n  bankName     String?\n  chequePayee  String?\n  chequeDate   DateTime?\n  notes        String?\n  createdAt    DateTime  @default(now())\n  updatedAt    DateTime  @updatedAt\n  purchase     Purchase  @relation(fields: [purchaseId], references: [id], onDelete: Cascade)\n\n  @@index([purchaseId])\n}\n\nmodel Listing {\n  id                   String                @id @default(uuid())\n  inventoryId          String?\n  platform             String\n  externalId           String?\n  listedPrice          Float\n  currency             String                @default(\"USD\")\n  status               String                @default(\"ACTIVE\")\n  listedDate           DateTime              @default(now())\n  createdAt            DateTime              @default(now())\n  updatedAt            DateTime              @updatedAt\n  listingUrl           String?\n  listingRef           String?\n  listingSku           String?\n  marketplaceTitle     String?\n  marketplacePrice     Float?\n  marketplaceQuantity  Int?\n  marketplaceViews     Int?\n  marketplaceFavorites Int?\n  marketplaceOrders    Int?\n  marketplaceShopName  String?\n  marketplaceShopId    String?\n  syncStatus           String?\n  syncError            String?\n  lastSyncedAt         DateTime?\n  rawMetadata          String?\n  inventory            Inventory?            @relation(fields: [inventoryId], references: [id])\n  marketplaceShop      MarketplaceShop?      @relation(fields: [marketplaceShopId], references: [id], onDelete: SetNull)\n  priceHistory         ListingPriceHistory[]\n\n  @@index([inventoryId])\n  @@index([listingSku])\n  @@index([syncStatus])\n  @@index([status])\n  @@index([status, platform])\n  @@index([createdAt])\n  @@index([marketplaceShopId, externalId])\n}\n\nmodel ListingPriceHistory {\n  id        String   @id @default(uuid())\n  listingId String\n  price     Float\n  changedBy String\n  changedAt DateTime @default(now())\n  listing   Listing  @relation(fields: [listingId], references: [id], onDelete: Cascade)\n\n  @@index([listingId])\n}\n\nmodel ListingMetricSnapshot {\n  id          String   @id @default(uuid())\n  inventoryId String\n  marketplace String\n  externalId  String\n  capturedAt  DateTime @default(now())\n\n  views      Int    @default(0)\n  watches    Int    @default(0)\n  favourites Int    @default(0)\n  orders     Int    @default(0)\n  revenue    Float  @default(0)\n  currency   String @default(\"USD\")\n\n  rawPayload String?\n  source     String\n\n  inventory Inventory @relation(fields: [inventoryId], references: [id], onDelete: Cascade)\n\n  @@unique([inventoryId, marketplace, externalId, capturedAt])\n  @@index([inventoryId, capturedAt])\n  @@index([marketplace, capturedAt])\n}\n\nmodel ListingOpportunity {\n  id          String  @id @default(uuid())\n  inventoryId String\n  marketplace String\n  externalId  String?\n\n  currentViews      Int    @default(0)\n  currentWatches    Int    @default(0)\n  currentFavourites Int    @default(0)\n  currentOrders     Int    @default(0)\n  currentRevenue    Float  @default(0)\n  currency          String @default(\"USD\")\n\n  lastSyncedAt DateTime?\n  updatedAt    DateTime  @updatedAt\n\n  inventory Inventory @relation(fields: [inventoryId], references: [id], onDelete: Cascade)\n\n  @@unique([inventoryId, marketplace])\n  @@index([marketplace, externalId])\n  @@index([lastSyncedAt])\n}\n\nmodel Sale {\n  id                     String                      @id @default(uuid())\n  orderId                String?\n  inventoryId            String\n  customerId             String?\n  customerName           String?\n  customerEmail          String?\n  customerPhone          String?\n  customerAddress        String?\n  billingAddress         String?\n  customerCity           String?\n  placeOfSupply          String?\n  shippingAddress        String?\n  shippingCharge         Float                       @default(0)\n  additionalCharge       Float                       @default(0)\n  saleDate               DateTime                    @default(now())\n  salePrice              Float\n  usdPrice               Float? // USD price for export invoices\n  taxAmount              Float                       @default(0)\n  discountAmount         Float                       @default(0)\n  netAmount              Float\n  paymentStatus          String                      @default(\"PENDING\")\n  paymentMethod          String?\n  platform               String                      @default(\"OFFLINE\")\n  notes                  String?\n  invoiceId              String?\n  legacyInvoiceId        String?                     @unique\n  costPriceSnapshot      Float?\n  profit                 Float?\n  actualProfit           Float?\n  internalShippingCost   Float                       @default(0)\n  internalPackagingCost  Float                       @default(0)\n  internalInsuranceCost  Float                       @default(0)\n  internalHandlingCost   Float                       @default(0)\n  internalOtherCharges   Float                       @default(0)\n  internalCostTotal      Float                       @default(0)\n  listedSku              String?\n  fulfillmentSku         String?\n  fulfillmentReason      String?\n  marketplaceOrderItemId String?\n  customer               Customer?                   @relation(fields: [customerId], references: [id])\n  inventory              Inventory                   @relation(fields: [inventoryId], references: [id])\n  invoice                Invoice?                    @relation(\"NewInvoice\", fields: [invoiceId], references: [id])\n  legacyInvoice          Invoice?                    @relation(\"LegacyInvoice\", fields: [legacyInvoiceId], references: [id])\n  advanceAdjustments     CustomerAdvanceAdjustment[]\n\n  @@index([customerId])\n  @@index([inventoryId])\n  @@index([saleDate])\n  @@index([saleDate, paymentStatus])\n  @@index([paymentStatus])\n  @@index([invoiceId])\n  @@index([legacyInvoiceId])\n}\n\nmodel Memo {\n  id           String     @id @default(uuid())\n  customerName String\n  issueDate    DateTime   @default(now())\n  expiryDate   DateTime?\n  status       String     @default(\"OPEN\")\n  notes        String?\n  items        MemoItem[]\n}\n\nmodel MemoItem {\n  id          String    @id @default(uuid())\n  memoId      String\n  inventoryId String\n  status      String    @default(\"WITH_CLIENT\")\n  memo        Memo      @relation(fields: [memoId], references: [id])\n  inventory   Inventory @relation(fields: [inventoryId], references: [id])\n\n  @@index([memoId])\n  @@index([inventoryId])\n}\n\nmodel Quotation {\n  id              String          @id @default(uuid())\n  quotationNumber String          @unique\n  token           String          @unique @default(cuid())\n  customerId      String?\n  customerName    String\n  customerEmail   String?\n  customerMobile  String?\n  customerAddress String?\n  customerCity    String?\n  status          String          @default(\"DRAFT\")\n  totalAmount     Float\n  validUntil      DateTime?\n  expiryDate      DateTime?\n  notes           String?\n  createdById     String\n  createdAt       DateTime        @default(now())\n  updatedAt       DateTime        @updatedAt\n  approvedById    String?\n  customer        Customer?       @relation(fields: [customerId], references: [id])\n  createdBy       User            @relation(\"CreatedQuotations\", fields: [createdById], references: [id])\n  approvedBy      User?           @relation(\"ApprovedQuotations\", fields: [approvedById], references: [id])\n  items           QuotationItem[]\n  invoices        Invoice[]\n\n  @@index([customerId])\n  @@index([createdById])\n  @@index([approvedById])\n  @@index([status])\n  @@index([status, validUntil])\n  @@index([status, createdAt])\n  @@index([createdAt])\n}\n\nmodel QuotationItem {\n  id          String    @id @default(uuid())\n  quotationId String\n  inventoryId String\n  quotedPrice Float\n  quotation   Quotation @relation(fields: [quotationId], references: [id], onDelete: Cascade)\n  inventory   Inventory @relation(fields: [inventoryId], references: [id])\n\n  @@index([quotationId])\n  @@index([inventoryId])\n}\n\nmodel Invoice {\n  id                   String    @id @default(uuid())\n  invoiceNumber        String    @unique\n  token                String    @unique @default(cuid())\n  quotationId          String?\n  status               String    @default(\"DRAFT\")\n  isActive             Boolean   @default(true)\n  dueDate              DateTime?\n  notes                String?\n  invoiceType          String    @default(\"TAX\")\n  iecCode              String?\n  exportType           String?\n  countryOfDestination String?\n  portOfDispatch       String?\n  modeOfTransport      String?\n  courierPartner       String?\n  trackingId           String?\n  invoiceCurrency      String?\n  conversionRate       Float?\n  totalInrValue        Float?\n\n  // ERP-only internal cost tracking (never shown on customer invoices)\n  internalShippingCost  Float @default(0)\n  internalPackagingCost Float @default(0)\n  internalInsuranceCost Float @default(0)\n  internalHandlingCost  Float @default(0)\n  internalOtherCharges  Float @default(0)\n  internalCostTotal     Float @default(0)\n\n  displayOptions String?\n  subtotal       Float\n  taxTotal       Float\n  discountTotal  Float\n  totalAmount    Float\n  createdAt      DateTime         @default(now())\n  updatedAt      DateTime         @updatedAt\n  paymentStatus  String           @default(\"UNPAID\")\n  paidAmount     Float            @default(0)\n  invoiceDate    DateTime?\n  quotation      Quotation?       @relation(fields: [quotationId], references: [id])\n  sales          Sale[]           @relation(\"NewInvoice\")\n  legacySale     Sale?            @relation(\"LegacyInvoice\")\n  versions       InvoiceVersion[]\n  payments       Payment[]\n  followUps      FollowUp[]\n  salesReturns   SalesReturn[]\n  creditNotes    CreditNote[]\n  exportInvoice  ExportInvoice?\n\n  @@index([quotationId])\n  @@index([paymentStatus])\n  @@index([status])\n  @@index([status, paymentStatus])\n  @@index([status, paymentStatus, dueDate])\n  @@index([createdAt])\n  @@index([dueDate])\n}\n\n// Separate table for Export Invoices - keeps invoice numbers in same sequence\nmodel ExportInvoice {\n  id                       String  @id @default(uuid())\n  invoiceId                String  @unique\n  // Export-specific fields (these extend the main Invoice)\n  customsDeclarationNumber String?\n  fobValue                 Float?\n  freightCharges           Float?\n  insuranceCharges         Float?\n  shippingBillNumber       String?\n  portCode                 String?\n  hsnCodes                 String?\n  // Additional commercial details\n  buyerReference           String?\n  contractNumber           String?\n  preCarriageBy            String?\n  preCarriagePort          String?\n\n  invoice   Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@index([invoiceId])\n  @@index([customsDeclarationNumber])\n}\n\nmodel Payment {\n  id         String   @id @default(uuid())\n  invoiceId  String\n  amount     Float\n  date       DateTime @default(now())\n  method     String\n  reference  String?\n  notes      String?\n  recordedBy String?\n  createdAt  DateTime @default(now())\n  updatedAt  DateTime @updatedAt\n  invoice    Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)\n\n  @@index([invoiceId])\n}\n\nmodel InventoryQrPaymentAuthorization {\n  id              String   @id @default(uuid())\n  inventoryId     String   @unique\n  enabled         Boolean  @default(false)\n  totalAmount     Float\n  amountToCollect Float\n  currency        String   @default(\"INR\")\n  allowPartial    Boolean  @default(false)\n  paidAmount      Float    @default(0)\n  customerName    String?\n  customerEmail   String?\n  customerPhone   String?\n  orderReference  String?\n  saleId          String?\n  updatedByUserId String?\n  createdAt       DateTime @default(now())\n  updatedAt       DateTime @updatedAt\n\n  @@index([enabled])\n}\n\nmodel InventoryQrPaymentAttempt {\n  id                String    @id @default(uuid())\n  authorizationId   String\n  inventoryId       String\n  amount            Float\n  currency          String    @default(\"INR\")\n  status            String    @default(\"CREATING\")\n  razorpayOrderId   String?   @unique\n  razorpayPaymentId String?   @unique\n  activeKey         String?   @unique\n  failureReason     String?\n  createdAt         DateTime  @default(now())\n  paidAt            DateTime?\n\n  @@index([authorizationId, status])\n  @@index([inventoryId, createdAt])\n}\n\nmodel InvoiceVersion {\n  id            String   @id @default(uuid())\n  invoiceId     String\n  versionNumber Int\n  reason        String?\n  snapshot      String?\n  createdAt     DateTime @default(now())\n  invoice       Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)\n\n  @@index([invoiceId])\n}\n\nmodel Setting {\n  id          String   @id @default(uuid())\n  key         String   @unique\n  value       String\n  description String?\n  updatedAt   DateTime @updatedAt\n}\n\nmodel CompanySettings {\n  id                   String   @id @default(uuid())\n  companyName          String\n  invoicePrefix        String?  @default(\"INV\")\n  invoicingStartNumber Int?     @default(1)\n  invoiceLogoUrl       String?\n  quotationLogoUrl     String?\n  logoUrl              String?\n  skuViewLogoUrl       String?\n  otherDocsLogoUrl     String?\n  address              String?\n  email                String?\n  phone                String?\n  website              String?\n  gstin                String?\n  enableExportInvoice  Boolean  @default(false)\n  defaultExportType    String?  @default(\"LUT\")\n  companyIec           String?\n  defaultCurrency      String?  @default(\"INR\")\n  defaultPort          String?\n  swiftCode            String?\n  termsAndConditions   String?\n  createdAt            DateTime @default(now())\n  updatedAt            DateTime @updatedAt\n}\n\nmodel FollowUp {\n  id            String    @id\n  invoiceId     String\n  date          DateTime  @default(now())\n  channel       String    @default(\"CALL\")\n  action        String?\n  note          String?\n  promisedDate  DateTime?\n  status        String    @default(\"OPEN\")\n  completedAt   DateTime?\n  cancelledAt   DateTime?\n  rescheduledTo DateTime?\n  updatedAt     DateTime  @updatedAt\n  createdById   String?   @map(\"createdBy\")\n  createdAt     DateTime  @default(now())\n\n  invoice   Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)\n  createdBy User?   @relation(fields: [createdById], references: [id])\n\n  @@index([invoiceId])\n  @@index([createdById])\n}\n\nmodel SalesReturn {\n  id            String   @id\n  invoiceId     String\n  returnNumber  String   @unique\n  returnDate    DateTime @default(now())\n  disposition   String\n  taxableAmount Float    @default(0)\n  igst          Float    @default(0)\n  cgst          Float    @default(0)\n  sgst          Float    @default(0)\n  totalTax      Float    @default(0)\n  totalAmount   Float    @default(0)\n  remarks       String?\n  createdById   String?\n  createdAt     DateTime @default(now())\n\n  invoice Invoice           @relation(fields: [invoiceId], references: [id])\n  items   SalesReturnItem[]\n\n  @@index([invoiceId])\n}\n\nmodel SalesReturnItem {\n  id            String  @id\n  salesReturnId String\n  inventoryId   String\n  quantity      Int     @default(1)\n  sellingPrice  Float\n  resaleable    Boolean @default(true)\n\n  salesReturn SalesReturn @relation(fields: [salesReturnId], references: [id], onDelete: Cascade)\n  inventory   Inventory   @relation(fields: [inventoryId], references: [id])\n\n  @@index([salesReturnId])\n  @@index([inventoryId])\n}\n\nmodel CreditNote {\n  id               String   @id\n  customerId       String?\n  invoiceId        String?\n  creditNoteNumber String   @unique\n  issueDate        DateTime @default(now())\n  totalAmount      Float\n  taxableAmount    Float    @default(0)\n  igst             Float    @default(0)\n  cgst             Float    @default(0)\n  sgst             Float    @default(0)\n  totalTax         Float    @default(0)\n  balanceAmount    Float\n  isActive         Boolean  @default(true)\n  createdAt        DateTime @default(now())\n\n  customer Customer? @relation(fields: [customerId], references: [id])\n  invoice  Invoice?  @relation(fields: [invoiceId], references: [id])\n\n  @@index([customerId])\n  @@index([invoiceId])\n}\n\nmodel InvoiceSettings {\n  id                  String   @id @default(uuid())\n  prefix              String   @default(\"INV\")\n  currencySymbol      String   @default(\"₹\")\n  digitalSignatureUrl String?\n  terms               String?\n  exportTerms         String? // Terms & Conditions for export invoices\n  footerNotes         String?\n  gstEnabled          Boolean  @default(false)\n  gstType             String   @default(\"CGST_SGST\")\n  categoryGstRates    String?\n  updatedAt           DateTime @updatedAt\n}\n\nmodel PaymentSettings {\n  id                String   @id @default(uuid())\n  upiEnabled        Boolean  @default(false)\n  upiId             String?\n  upiPayeeName      String?\n  upiQrUrl          String?\n  bankEnabled       Boolean  @default(false)\n  bankName          String?\n  accountNumber     String?\n  ifscCode          String?\n  swiftCode         String?\n  accountHolder     String?\n  razorpayEnabled   Boolean  @default(false)\n  razorpayKeyId     String?\n  razorpayKeySecret String?\n  razorpayButtonId  String?\n  updatedAt         DateTime @updatedAt\n}\n\nmodel ActivityLog {\n  id               String  @id @default(uuid())\n  entityType       String?\n  entityId         String?\n  entityIdentifier String?\n  idempotencyKey   String?\n  actionType       String?\n  userId           String?\n  userName         String?\n  userEmail        String?\n  ipAddress        String?\n  userAgent        String?\n  source           String?\n  fieldChanges     String?\n  details          String?\n\n  module      String?\n  action      String?\n  referenceId String?\n  description String?\n  metadata    String?\n\n  createdAt DateTime @default(now())\n\n  @@unique([userId, actionType, idempotencyKey])\n  @@index([userId])\n  @@index([module])\n  @@index([createdAt])\n}\n\nmodel LabelPrintJob {\n  id          String              @id @default(uuid())\n  userId      String\n  layoutId    String?\n  printerId   String?\n  status      String              @default(\"PENDING\")\n  printFormat String?\n  totalItems  Int                 @default(0)\n  createdAt   DateTime            @default(now())\n  user        User                @relation(fields: [userId], references: [id])\n  items       LabelPrintJobItem[]\n\n  @@index([userId])\n}\n\nmodel LabelPrintJobItem {\n  id                String        @id @default(uuid())\n  jobId             String\n  sku               String\n  sellingPrice      Float\n  priceWithChecksum String?\n  checksumDigit     Int?\n  checksumMethod    String?\n  encodingVersion   Int?\n  internalName      String?\n  job               LabelPrintJob @relation(fields: [jobId], references: [id], onDelete: Cascade)\n\n  @@index([jobId])\n}\n\nmodel LabelCartItem {\n  id          String    @id @default(uuid())\n  userId      String\n  inventoryId String\n  addedAt     DateTime  @default(now())\n  user        User      @relation(fields: [userId], references: [id])\n  inventory   Inventory @relation(fields: [inventoryId], references: [id])\n\n  @@unique([userId, inventoryId])\n  @@index([userId])\n  @@index([inventoryId])\n}\n\nmodel PackagingCartItem {\n  id          String    @id @default(uuid())\n  userId      String\n  inventoryId String\n  quantity    Int       @default(1)\n  location    String?\n  addedAt     DateTime  @default(now())\n  user        User      @relation(fields: [userId], references: [id])\n  inventory   Inventory @relation(fields: [inventoryId], references: [id], onDelete: Cascade)\n\n  @@unique([userId, inventoryId])\n  @@index([userId])\n  @@index([inventoryId])\n}\n\nmodel SalesMarginAnalytics {\n  id        String   @id @default(uuid())\n  userId    String?\n  period    String\n  startDate DateTime\n  endDate   DateTime\n  revenue   Float\n  cost      Float\n  margin    Float\n  createdAt DateTime @default(now())\n  user      User?    @relation(fields: [userId], references: [id])\n\n  @@index([userId])\n}\n\nmodel ReportExportJob {\n  id            String    @id @default(uuid())\n  reportType    String\n  format        String\n  dateFrom      DateTime?\n  dateTo        DateTime?\n  filtersJson   String?\n  status        String    @default(\"QUEUED\")\n  requestedById String?\n  requestedBy   String?\n  downloadUrl   String?\n  errorMessage  String?\n  createdAt     DateTime  @default(now())\n  updatedAt     DateTime  @updatedAt\n\n  @@index([reportType])\n  @@index([status])\n  @@index([createdAt])\n  @@index([requestedById])\n}\n\nmodel WorkerLockHeartbeat {\n  id          String   @id\n  ownerId     String\n  leaseUntil  DateTime\n  heartbeatAt DateTime\n  createdAt   DateTime @default(now())\n  updatedAt   DateTime @updatedAt\n\n  @@index([leaseUntil])\n  @@index([ownerId])\n}\n\nmodel AnalyticsDailySnapshot {\n  id                 String   @id @default(uuid())\n  snapshotDate       DateTime @unique\n  inventoryCount     Int\n  inventoryValueCost Float\n  inventoryValueSell Float\n  salesCount         Int\n  salesRevenue       Float\n  profitAmount       Float\n  invoiceCount       Int\n  pendingInvoices    Int\n  paymentReceived    Float\n  createdAt          DateTime @default(now())\n\n  @@index([snapshotDate])\n}\n\nmodel AnalyticsInventorySnapshot {\n  id           String   @id @default(uuid())\n  inventoryId  String   @unique\n  sku          String\n  itemName     String\n  category     String\n  vendorName   String\n  purchaseCost Float\n  sellingPrice Float\n  daysInStock  Int\n  status       String\n  ageBucket    String\n  createdAt    DateTime @default(now())\n\n  @@index([category])\n  @@index([vendorName])\n  @@index([status])\n  @@index([daysInStock])\n  @@index([ageBucket])\n}\n\nmodel AnalyticsVendorSnapshot {\n  id                 String    @id @default(uuid())\n  vendorId           String\n  snapshotDate       DateTime\n  vendorName         String\n  totalItemsSupplied Int\n  totalPurchaseValue Float\n  inventoryInStock   Int\n  inventoryValue     Float\n  lastPurchaseDate   DateTime?\n  createdAt          DateTime  @default(now())\n\n  @@unique([vendorId, snapshotDate])\n  @@index([vendorId])\n  @@index([snapshotDate])\n}\n\nmodel AnalyticsSalesSnapshot {\n  id            String   @id @default(uuid())\n  saleId        String   @unique\n  sku           String\n  itemName      String\n  category      String\n  purchaseCost  Float\n  sellingPrice  Float\n  profitAmount  Float\n  saleDate      DateTime\n  saleCycleDays Int\n  createdAt     DateTime @default(now())\n\n  @@index([saleDate])\n  @@index([category])\n  @@index([saleCycleDays])\n}\n\nmodel AnalyticsLabelSnapshot {\n  id            String   @id @default(uuid())\n  jobId         String\n  printedBy     String\n  labelsPrinted Int\n  printedAt     DateTime\n  createdAt     DateTime @default(now())\n\n  @@index([jobId])\n  @@index([printedBy])\n  @@index([printedAt])\n}\n\nmodel PriceOverrideAudit {\n  id            String   @id @default(uuid())\n  userId        String\n  inventoryId   String\n  originalPrice Float\n  newPrice      Float\n  reason        String?\n  approvedBy    String?\n  createdAt     DateTime @default(now())\n  user          User     @relation(fields: [userId], references: [id])\n\n  @@index([userId])\n}\n\nmodel DashboardNote {\n  id          String   @id @default(uuid())\n  content     String\n  color       String   @default(\"yellow\")\n  position    Int      @default(0)\n  createdById String\n  createdAt   DateTime @default(now())\n  updatedAt   DateTime @updatedAt\n  createdBy   User     @relation(fields: [createdById], references: [id])\n\n  @@index([createdById])\n}\n\nmodel ExpenseCategory {\n  id         String    @id @default(uuid())\n  name       String    @unique\n  code       String?   @unique\n  gstAllowed Boolean   @default(false)\n  status     String    @default(\"ACTIVE\")\n  createdAt  DateTime  @default(now())\n  expenses   Expense[]\n}\n\nmodel Voucher {\n  id             String   @id @default(uuid())\n  voucherNumber  String   @unique\n  voucherType    String\n  voucherDate    DateTime\n  referenceId    String?\n  narration      String?\n  amount         Float\n  isReversed     Boolean  @default(false)\n  reversalReason String?\n  createdById    String\n  createdAt      DateTime @default(now())\n  createdBy      User     @relation(fields: [createdById], references: [id])\n  expense        Expense?\n\n  @@index([createdById])\n  @@index([voucherNumber])\n  @@index([referenceId])\n  @@index([voucherDate])\n}\n\nmodel Expense {\n  id            String          @id @default(uuid())\n  expenseDate   DateTime\n  categoryId    String\n  description   String\n  vendorName    String?\n  referenceNo   String?\n  totalAmount   Float\n  paymentMode   String\n  paymentStatus String          @default(\"PAID\")\n  paidAmount    Float           @default(0)\n  paymentDate   DateTime?\n  paymentRef    String?\n  attachmentUrl String?\n  voucherId     String?         @unique\n  createdById   String\n  createdAt     DateTime        @default(now())\n  updatedAt     DateTime        @updatedAt\n  voucher       Voucher?        @relation(fields: [voucherId], references: [id])\n  category      ExpenseCategory @relation(fields: [categoryId], references: [id])\n  createdBy     User            @relation(fields: [createdById], references: [id])\n\n  @@index([categoryId])\n  @@index([createdById])\n  @@index([expenseDate])\n  @@index([paymentStatus])\n}\n\nmodel Account {\n  id           String        @id @default(uuid())\n  code         String        @unique\n  name         String\n  type         String\n  subtype      String?\n  description  String?\n  isActive     Boolean       @default(true)\n  createdAt    DateTime      @default(now())\n  updatedAt    DateTime      @updatedAt\n  journalLines JournalLine[]\n}\n\nmodel JournalEntry {\n  id            String        @id @default(uuid())\n  date          DateTime\n  description   String\n  referenceType String?\n  referenceId   String?\n  createdById   String\n  createdAt     DateTime      @default(now())\n  isReversed    Boolean       @default(false)\n  lines         JournalLine[]\n  createdBy     User          @relation(fields: [createdById], references: [id])\n\n  @@index([date])\n  @@index([referenceId])\n  @@index([createdById])\n}\n\nmodel JournalLine {\n  id             String       @id @default(uuid())\n  journalEntryId String\n  accountId      String\n  debit          Float        @default(0)\n  credit         Float        @default(0)\n  description    String?\n  journalEntry   JournalEntry @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)\n  account        Account      @relation(fields: [accountId], references: [id])\n\n  @@index([journalEntryId])\n  @@index([accountId])\n}\n\nmodel SerializedUnit {\n  id              String              @id @default(uuid())\n  inventoryId     String\n  sku             String\n  serialNumber    String              @unique\n  fullHash        String\n  shortHash       String\n  packagingStatus String              @default(\"GENERATED\")\n  printCount      Int                 @default(0)\n  qrScanCount     Int                 @default(0)\n  firstScanAt     DateTime?\n  lastScanAt      DateTime?\n  createdAt       DateTime            @default(now())\n  createdById     String\n  printedAt       DateTime?\n  printedById     String?\n  soldAt          DateTime?\n  returnedAt      DateTime?\n  voidReason      String?\n  isActive        Boolean             @default(true)\n  inventory       Inventory           @relation(fields: [inventoryId], references: [id])\n  createdBy       User                @relation(\"CreatedSerials\", fields: [createdById], references: [id])\n  printedBy       User?               @relation(\"PrintedSerials\", fields: [printedById], references: [id])\n  logs            SerialActivityLog[]\n\n  @@index([inventoryId])\n  @@index([sku])\n  @@index([packagingStatus])\n  @@index([createdAt])\n  @@index([createdById])\n  @@index([printedById])\n}\n\nmodel SerialActivityLog {\n  id         String         @id @default(uuid())\n  serialId   String\n  actionType String\n  userId     String?\n  ipAddress  String?\n  userAgent  String?\n  timestamp  DateTime       @default(now())\n  metadata   String?\n  serial     SerializedUnit @relation(fields: [serialId], references: [id])\n\n  @@index([serialId])\n  @@index([timestamp])\n}\n\nmodel GpisSettings {\n  id                    String   @id @default(uuid())\n  brandName             String?\n  tagline               String?\n  estYear               String?\n  registeredAddress     String?\n  gstin                 String?\n  iec                   String?\n  supportEmail          String?\n  supportPhone          String?\n  supportTimings        String?\n  website               String?\n  categoryHsnJson       String?\n  showRegisteredAddress Boolean  @default(true)\n  showGstin             Boolean  @default(true)\n  showIec               Boolean  @default(true)\n  showSupport           Boolean  @default(true)\n  showWatermark         Boolean  @default(true)\n  watermarkText         String?\n  watermarkOpacity      Int      @default(6)\n  watermarkRotation     Int      @default(-30)\n  watermarkFontSize     Int      @default(16)\n  watermarkFontFamily   String?  @default(\"helvetica\")\n  labelFontFamily       String?  @default(\"helvetica\")\n  microBorderText       String?  @default(\"KHYATI GEMS AUTHENTIC PRODUCT\")\n  toleranceCarat        Float    @default(0.05)\n  toleranceGram         Float    @default(0.01)\n  labelVersion          String?\n  logoUrl               String?\n  careInstruction       String?\n  legalMetrologyLine    String?\n  updatedAt             DateTime @updatedAt\n}\n\nmodel EbaySettings {\n  id                       String   @id @default(uuid())\n  globalBannerImages       String? // JSON array of URLs\n  categoryImageUrls        String? // JSON object: { \"Category\": [\"url1\", ...] }\n  categoryGemtypeImageUrls String?  @default(\"{}\") // JSON object: { \"Category|GemType\": [\"url1\", \"url2\", \"url3\"] }\n  maxImagesPerCategory     Int      @default(4)\n  imagesPerDescription     Int      @default(3)\n  imageRotationMode        String   @default(\"SEQUENTIAL\")\n  brandLogoUrl             String?\n  companyName              String   @default(\"KhyatiGems\")\n  tagline                  String   @default(\"Precious Gems for your Precious Ones\")\n  createdAt                DateTime @default(now())\n  updatedAt                DateTime @updatedAt\n\n  @@index([createdAt])\n}\n\nmodel GpisLayoutPreset {\n  id                 String   @id @default(uuid())\n  name               String   @unique\n  unit               String   @default(\"MM\")\n  pageWidthMm        Float    @default(210)\n  pageHeightMm       Float    @default(297)\n  cols               Int      @default(2)\n  rows               Int      @default(5)\n  labelWidthMm       Float    @default(100)\n  labelHeightMm      Float    @default(50)\n  marginLeftMm       Float    @default(5)\n  marginTopMm        Float    @default(23.5)\n  gapXmm             Float    @default(0)\n  gapYmm             Float    @default(0)\n  offsetXmm          Float    @default(0)\n  offsetYmm          Float    @default(0)\n  startPosition      Int      @default(1)\n  selectedFieldsJson String?\n  isDefault          Boolean  @default(false)\n  createdAt          DateTime @default(now())\n  updatedAt          DateTime @updatedAt\n\n  @@map(\"gpis_layout_presets\")\n}\n\nmodel GpisSerial {\n  id                String             @id @default(uuid())\n  sku               String\n  serialNumber      String             @unique\n  categoryCode      String\n  yearMonth         String?\n  runningNumber     Int?\n  hashFragment      String?\n  status            String             @default(\"ACTIVE\")\n  inventoryLocation String?\n  qcCode            String?\n  packedAt          DateTime           @default(now())\n  packingDate       DateTime           @default(now()) @map(\"packing_date\")\n  reprintCount      Int                @default(0)\n  labelVersion      String?            @map(\"label_version\")\n  unitQuantity      Int                @default(1) @map(\"unit_quantity\")\n  madeIn            String             @default(\"India\") @map(\"made_in\")\n  declaredOriginal  Boolean            @default(true) @map(\"declared_original\")\n  createdBy         String?\n  createdAt         DateTime           @default(now())\n  printJobItems     GpisPrintJobItem[]\n\n  @@index([sku])\n  @@index([status])\n  @@index([serialNumber])\n}\n\nmodel GpisPrintJob {\n  id             String             @id @default(uuid())\n  printJobId     String             @unique\n  sku            String?\n  startSerial    String?\n  endSerial      String?\n  totalLabels    Int?\n  printerType    String?\n  printedBy      String?\n  printedAt      DateTime           @default(now())\n  status         String?\n  supersededById String?\n  supersededAt   DateTime?\n  items          GpisPrintJobItem[]\n\n  @@index([printJobId])\n  @@index([sku])\n}\n\nmodel GpisPrintJobItem {\n  id           String       @id @default(uuid())\n  printJobId   String\n  serialId     String\n  serialNumber String\n  sku          String\n  createdAt    DateTime     @default(now())\n  printJob     GpisPrintJob @relation(fields: [printJobId], references: [id], onDelete: Cascade)\n  serial       GpisSerial   @relation(fields: [serialId], references: [id], onDelete: Cascade)\n\n  @@index([serialNumber])\n  @@index([sku])\n  @@index([printJobId])\n  @@index([serialId])\n  @@map(\"gpis_print_job_items\")\n}\n\nmodel GpisVerificationLog {\n  id           String   @id @default(uuid())\n  serialNumber String\n  scannedAt    DateTime @default(now())\n  ipAddress    String?\n  userAgent    String?\n\n  @@index([serialNumber])\n  @@index([scannedAt])\n}\n\nmodel CertificateCodeToInventory {\n  A String\n  B String\n\n  @@unique([A, B], map: \"_CertificateCodeToInventory_AB_unique\")\n  @@index([B], map: \"_CertificateCodeToInventory_B_index\")\n  @@map(\"_CertificateCodeToInventory\")\n}\n\nmodel InventoryToRashiCode {\n  A String\n  B String\n\n  @@unique([A, B], map: \"_InventoryToRashiCode_AB_unique\")\n  @@index([B], map: \"_InventoryToRashiCode_B_index\")\n  @@map(\"_InventoryToRashiCode\")\n}\n\nmodel StateCode {\n  id        String   @id @default(uuid())\n  name      String   @unique\n  code      String   @unique\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n}\n\nmodel PriceRecommendationLog {\n  id                     String   @id @default(uuid())\n  inventoryId            String?\n  userId                 String?\n  suggestedSellingRate   Float?\n  suggestedSellingPrice  Float?\n  suggestedPurchaseRate  Float?\n  appliedSellingRate     Float?\n  appliedSellingPrice    Float?\n  appliedPurchaseRate    Float?\n  sellingDeviationPct    Float?\n  purchaseDeviationPct   Float?\n  confidence             Float?\n  matchLevel             String?\n  sampleCount            Int?\n  minRate                Float?\n  maxRate                Float?\n  recommendationSnapshot String?\n  createdAt              DateTime @default(now())\n\n  @@index([inventoryId])\n  @@index([userId])\n  @@index([createdAt])\n}\n\nmodel MarketplaceProfile {\n  id          String   @id @default(uuid())\n  name        String   @unique\n  displayName String\n  currency    String   @default(\"INR\")\n  isActive    Boolean  @default(true)\n  isDefault   Boolean  @default(false)\n  marginType  String   @default(\"PERCENT\")\n  marginValue Float    @default(0)\n  createdAt   DateTime @default(now())\n  updatedAt   DateTime @updatedAt\n\n  charges MarketplaceCharge[]\n}\n\nmodel MarketplaceCharge {\n  id          String             @id @default(uuid())\n  profileId   String\n  chargeKey   String\n  name        String\n  enabled     Boolean            @default(true)\n  amountType  String             @default(\"PERCENT\")\n  amount      Float              @default(0)\n  countryCode String?\n  sortOrder   Int                @default(0)\n  createdAt   DateTime           @default(now())\n  updatedAt   DateTime           @updatedAt\n  profile     MarketplaceProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)\n\n  @@index([profileId])\n}\n\nmodel CurrencyRate {\n  id        String   @id @default(uuid())\n  code      String   @unique\n  rateToInr Float    @default(0)\n  isBase    Boolean  @default(false)\n  updatedAt DateTime @updatedAt\n}\n\nmodel MarketplaceConnection {\n  id                String            @id @default(uuid())\n  marketplace       String\n  externalAccountId String?\n  name              String?\n  authType          String            @default(\"OAUTH2\")\n  // Identifies the server-side Etsy credential set used for this OAuth grant.\n  // Secrets remain exclusively in environment variables.\n  oauthAppProfile   String?\n  clientId          String?\n  tokenRef          String?\n  status            String            @default(\"DISCONNECTED\")\n  scopes            String?\n  lastConnectedAt   DateTime?\n  createdAt         DateTime          @default(now())\n  updatedAt         DateTime          @updatedAt\n  shops             MarketplaceShop[]\n\n  @@unique([marketplace, externalAccountId])\n  @@index([marketplace])\n  @@index([status])\n}\n\nmodel MarketplaceShop {\n  id             String                @id @default(uuid())\n  connectionId   String\n  marketplace    String\n  externalShopId String\n  name           String\n  status         String                @default(\"CONNECTED\")\n  createdAt      DateTime              @default(now())\n  updatedAt      DateTime              @updatedAt\n  connection     MarketplaceConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)\n  listings       Listing[]\n  orders         MarketplaceOrder[]\n  syncLogs       MarketplaceSyncLog[]\n  syncJobs       MarketplaceSyncJob[]\n\n  @@unique([marketplace, externalShopId])\n  @@index([connectionId, status])\n  @@index([marketplace, status])\n}\n\nmodel MarketplaceSyncLog {\n  id                String           @id @default(uuid())\n  marketplace       String\n  syncType          String\n  status            String           @default(\"RUNNING\")\n  startedAt         DateTime         @default(now())\n  endedAt           DateTime?\n  recordsScanned    Int              @default(0)\n  recordsCreated    Int              @default(0)\n  recordsUpdated    Int              @default(0)\n  recordsSkipped    Int              @default(0)\n  recordsFailed     Int              @default(0)\n  errorDetails      String?\n  triggeredBy       String?\n  marketplaceShopId String?\n  createdAt         DateTime         @default(now())\n  updatedAt         DateTime         @updatedAt\n  marketplaceShop   MarketplaceShop? @relation(fields: [marketplaceShopId], references: [id], onDelete: SetNull)\n\n  @@index([marketplace, syncType])\n  @@index([status])\n  @@index([startedAt])\n  @@index([marketplaceShopId, syncType, startedAt])\n}\n\nmodel MarketplaceSyncJob {\n  id                String          @id @default(uuid())\n  marketplaceShopId String\n  syncType          String\n  status            String          @default(\"QUEUED\")\n  progressStep      String          @default(\"Queued\")\n  progressDetail    String?\n  cursor            String?\n  recordsScanned    Int             @default(0)\n  recordsCreated    Int             @default(0)\n  recordsUpdated    Int             @default(0)\n  recordsSkipped    Int             @default(0)\n  recordsFailed     Int             @default(0)\n  attempts          Int             @default(0)\n  errorDetails      String?\n  requestedById     String?\n  requestedBy       String?\n  batchId           String?\n  startedAt         DateTime?\n  endedAt           DateTime?\n  createdAt         DateTime        @default(now())\n  updatedAt         DateTime        @updatedAt\n  marketplaceShop   MarketplaceShop @relation(fields: [marketplaceShopId], references: [id], onDelete: Cascade)\n\n  @@index([status, createdAt])\n  @@index([batchId])\n  @@index([marketplaceShopId, syncType, createdAt])\n}\n\nmodel EbayWebhookNotification {\n  id             String    @id @default(uuid())\n  notificationId String    @unique\n  topic          String\n  ebayUserId     String?\n  ebayUsername   String?\n  signatureValid Boolean   @default(false)\n  status         String    @default(\"RECEIVED\")\n  receivedAt     DateTime  @default(now())\n  processedAt    DateTime?\n  errorDetails   String?\n\n  @@index([topic, receivedAt])\n  @@index([ebayUserId])\n  @@index([status])\n}\n\nmodel MarketplaceOrder {\n  id                  String                 @id @default(uuid())\n  marketplace         String\n  marketplaceOrderId  String\n  orderNumber         String?\n  marketplaceShopName String?\n  marketplaceShopId   String?\n  status              String                 @default(\"IMPORTED\")\n  buyerName           String?\n  buyerEmail          String?\n  buyerCountry        String?\n  buyerCity           String?\n  buyerState          String?\n  buyerZip            String?\n  trackingCode        String?\n  carrier             String?\n  orderTotal          Float?\n  currency            String                 @default(\"USD\")\n  orderDate           DateTime?\n  rawMetadata         String?\n  lastSyncedAt        DateTime?\n  createdAt           DateTime               @default(now())\n  updatedAt           DateTime               @updatedAt\n  items               MarketplaceOrderItem[]\n  marketplaceShop     MarketplaceShop?       @relation(fields: [marketplaceShopId], references: [id], onDelete: SetNull)\n\n  @@unique([marketplaceShopId, marketplace, marketplaceOrderId])\n  @@index([marketplace])\n  @@index([status])\n  @@index([orderDate])\n  @@index([marketplaceShopId, marketplaceOrderId])\n}\n\nmodel MarketplaceOrderItem {\n  id                String           @id @default(uuid())\n  orderId           String\n  marketplaceItemId String?\n  listedSku         String?\n  listedTitle       String?\n  quantity          Int              @default(1)\n  unitPrice         Float?\n  currency          String           @default(\"USD\")\n  fulfillmentSku    String?\n  fulfillmentReason String?\n  inventoryId       String?\n  status            String           @default(\"PENDING\")\n  rawMetadata       String?\n  createdAt         DateTime         @default(now())\n  updatedAt         DateTime         @updatedAt\n  order             MarketplaceOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)\n\n  @@unique([orderId, marketplaceItemId])\n  @@index([orderId])\n  @@index([listedSku])\n  @@index([fulfillmentSku])\n  @@index([inventoryId])\n}\n\nmodel Document {\n  id                String   @id @default(uuid())\n  customerId        String?\n  orderId           String?\n  saleId            String?\n  invoiceId         String?\n  type              String\n  fileName          String\n  mimeType          String   @default(\"application/pdf\")\n  sizeBytes         Int?\n  storageProvider   String   @default(\"CLOUDINARY\")\n  storageRef        String?\n  certificateNumber String?\n  status            String   @default(\"READY\")\n  errorMessage      String?\n  createdAt         DateTime @default(now())\n  updatedAt         DateTime @updatedAt\n\n  @@index([orderId])\n  @@index([saleId])\n  @@index([invoiceId])\n  @@index([customerId])\n  @@index([type])\n  @@index([certificateNumber])\n}\n\nmodel EmailLog {\n  id                  String    @id @default(uuid())\n  customerId          String?\n  orderId             String?\n  templateKey         String?\n  recipient           String\n  cc                  String?\n  bcc                 String?\n  subject             String\n  bodyRef             String?\n  bodyHtml            String?\n  bodyText            String?\n  payloadJson         String?\n  retryHistoryJson    String?\n  idempotencyKey      String?   @unique\n  threadId            String?\n  messageId           String?\n  inReplyTo           String?\n  referencesJson      String?\n  emailType           String?\n  direction           String    @default(\"OUTBOUND\")\n  provider            String?\n  providerMessageId   String?\n  status              String    @default(\"DRAFT\")\n  attemptCount        Int       @default(0)\n  lastAttemptAt       DateTime?\n  nextRetryAt         DateTime?\n  lastError           String?\n  failureCode         String?\n  processingStartedAt DateTime?\n  queuedAt            DateTime?\n  sentAt              DateTime?\n  deliveredAt         DateTime?\n  openedAt            DateTime?\n  bouncedAt           DateTime?\n  failedAt            DateTime?\n  cancelledAt         DateTime?\n  isRead              Boolean   @default(true)\n  readAt              DateTime?\n  errorMessage        String?\n  attachmentsJson     String?\n  receivedAt          DateTime?\n  createdAt           DateTime  @default(now())\n  updatedAt           DateTime  @updatedAt\n\n  @@index([customerId])\n  @@index([orderId])\n  @@index([status])\n  @@index([status, nextRetryAt])\n  @@index([threadId, createdAt])\n  @@index([isRead, direction, createdAt])\n  @@index([messageId])\n  @@index([providerMessageId])\n  @@index([createdAt])\n}\n\nmodel EmailProviderEvent {\n  id                String   @id\n  eventId           String   @unique\n  communicationId   String\n  providerMessageId String\n  eventType         String\n  occurredAt        DateTime\n  receivedAt        DateTime @default(now())\n\n  @@index([communicationId, occurredAt])\n  @@index([providerMessageId])\n}\n\n// Work tracker uses strings for enums, matching the SQLite schema conventions.\nmodel WorkSession {\n  id                   String              @id @default(uuid())\n  userId               String\n  platform             String\n  activityType         String\n  description          String              @default(\"\")\n  sku                  String?\n  marketplaceListingId String?\n  inventoryId          String?\n  marketplaceShopId    String?\n  listingRecordId      String?\n  startedAt            DateTime\n  endedAt              DateTime?\n  durationSeconds      Int                 @default(0)\n  status               String              @default(\"RUNNING\")\n  trackingSource       String              @default(\"MANUAL\")\n  notes                String?\n  requestId            String\n  // Unique non-null user ID while RUNNING or PAUSED; database-enforced timer lock.\n  activeUserId         String?             @unique\n  revision             Int                 @default(0)\n  createdAt            DateTime            @default(now())\n  updatedAt            DateTime            @updatedAt\n  user                 User                @relation(fields: [userId], references: [id])\n  intervals            WorkInterval[]\n  events               WorkActivityEvent[]\n\n  @@unique([userId, requestId])\n  @@index([userId, startedAt])\n  @@index([platform, startedAt])\n  @@index([status])\n}\n\nmodel WorkInterval {\n  id        String      @id @default(uuid())\n  sessionId String\n  startedAt DateTime\n  endedAt   DateTime?\n  session   WorkSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)\n\n  @@index([sessionId, startedAt])\n}\n\nmodel WorkTarget {\n  id            String   @id @default(uuid())\n  userId        String\n  platform      String\n  period        String\n  targetMinutes Int\n  createdAt     DateTime @default(now())\n  updatedAt     DateTime @updatedAt\n  user          User     @relation(fields: [userId], references: [id])\n\n  @@unique([userId, platform, period])\n}\n\nmodel WorkActivityEvent {\n  id              String       @id\n  userId          String\n  platform        String\n  domain          String\n  eventType       String\n  occurredAt      DateTime\n  durationSeconds Int          @default(0)\n  source          String       @default(\"EXTENSION\")\n  sessionId       String?\n  createdAt       DateTime     @default(now())\n  user            User         @relation(fields: [userId], references: [id])\n  session         WorkSession? @relation(fields: [sessionId], references: [id], onDelete: SetNull)\n\n  @@index([userId, occurredAt])\n  @@index([sessionId])\n}\n\nmodel WorkTrackerCredential {\n  id        String    @id @default(uuid())\n  userId    String\n  name      String\n  tokenHash String    @unique\n  expiresAt DateTime\n  revokedAt DateTime?\n  createdAt DateTime  @default(now())\n  user      User      @relation(fields: [userId], references: [id])\n\n  @@index([userId])\n}\n\nmodel WeeklyReportRun {\n  id            String                 @id @default(uuid())\n  executionKey  String                 @unique\n  mode          String\n  status        String                 @default(\"QUEUED\")\n  periodStart   DateTime\n  periodEnd     DateTime\n  timezone      String\n  scheduledFor  DateTime?\n  configHash    String\n  settingsJson  String\n  metricsJson   String?\n  dataQuality   String                 @default(\"PENDING\")\n  pdfBase64     String?\n  pdfChecksum   String?\n  pdfBytes      Int?\n  attempts      Int                    @default(0)\n  leaseOwner    String?\n  leaseUntil    DateTime?\n  nextAttemptAt DateTime?\n  requestedById String?\n  errorCode     String?\n  errorSummary  String?\n  startedAt     DateTime?\n  completedAt   DateTime?\n  createdAt     DateTime               @default(now())\n  updatedAt     DateTime               @updatedAt\n  deliveries    WeeklyReportDelivery[]\n\n  @@index([status, nextAttemptAt])\n  @@index([periodStart, periodEnd])\n  @@index([createdAt])\n}\n\nmodel WeeklyReportDelivery {\n  id                String          @id @default(uuid())\n  runId             String\n  recipient         String\n  status            String          @default(\"PENDING\")\n  attempts          Int             @default(0)\n  attemptedAt       DateTime?\n  acceptedAt        DateTime?\n  nextAttemptAt     DateTime?\n  providerMessageId String?\n  emailLogId        String?\n  errorCode         String?\n  errorSummary      String?\n  createdAt         DateTime        @default(now())\n  updatedAt         DateTime        @updatedAt\n  run               WeeklyReportRun @relation(fields: [runId], references: [id], onDelete: Cascade)\n\n  @@unique([runId, recipient])\n  @@index([status, nextAttemptAt])\n  @@index([runId])\n}\n",
  "inlineSchemaHash": "2465d0b6681f92d4d19e05bc0b5c1526c0111ab6855091cb6a28467df7908851",
  "copyEngine": true
}
config.dirname = '/'

config.runtimeDataModel = JSON.parse("{\"models\":{\"User\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"password\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"role\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"roleId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"avatar\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"avatarUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"avatarHistory\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"themePreference\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"premiumMode\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"lastLogin\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"lastPasswordChange\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"forceLogoutBefore\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"workSessions\",\"kind\":\"object\",\"type\":\"WorkSession\",\"relationName\":\"UserToWorkSession\"},{\"name\":\"workTargets\",\"kind\":\"object\",\"type\":\"WorkTarget\",\"relationName\":\"UserToWorkTarget\"},{\"name\":\"workActivityEvents\",\"kind\":\"object\",\"type\":\"WorkActivityEvent\",\"relationName\":\"UserToWorkActivityEvent\"},{\"name\":\"workTrackerCredentials\",\"kind\":\"object\",\"type\":\"WorkTrackerCredential\",\"relationName\":\"UserToWorkTrackerCredential\"},{\"name\":\"notifications\",\"kind\":\"object\",\"type\":\"Notification\",\"relationName\":\"NotificationToUser\"},{\"name\":\"roleRelation\",\"kind\":\"object\",\"type\":\"Role\",\"relationName\":\"RoleToUser\"},{\"name\":\"userPermissions\",\"kind\":\"object\",\"type\":\"UserPermission\",\"relationName\":\"UserToUserPermission\"},{\"name\":\"labelCartItems\",\"kind\":\"object\",\"type\":\"LabelCartItem\",\"relationName\":\"LabelCartItemToUser\"},{\"name\":\"packagingCartItems\",\"kind\":\"object\",\"type\":\"PackagingCartItem\",\"relationName\":\"PackagingCartItemToUser\"},{\"name\":\"labelPrintJobs\",\"kind\":\"object\",\"type\":\"LabelPrintJob\",\"relationName\":\"LabelPrintJobToUser\"},{\"name\":\"createdLandingPageVersions\",\"kind\":\"object\",\"type\":\"LandingPageVersion\",\"relationName\":\"LandingPageVersionToUser\"},{\"name\":\"createdQuotations\",\"kind\":\"object\",\"type\":\"Quotation\",\"relationName\":\"CreatedQuotations\"},{\"name\":\"createdSerials\",\"kind\":\"object\",\"type\":\"SerializedUnit\",\"relationName\":\"CreatedSerials\"},{\"name\":\"printedSerials\",\"kind\":\"object\",\"type\":\"SerializedUnit\",\"relationName\":\"PrintedSerials\"},{\"name\":\"approvedQuotations\",\"kind\":\"object\",\"type\":\"Quotation\",\"relationName\":\"ApprovedQuotations\"},{\"name\":\"marginAnalytics\",\"kind\":\"object\",\"type\":\"SalesMarginAnalytics\",\"relationName\":\"SalesMarginAnalyticsToUser\"},{\"name\":\"priceOverrides\",\"kind\":\"object\",\"type\":\"PriceOverrideAudit\",\"relationName\":\"PriceOverrideAuditToUser\"},{\"name\":\"dashboardNotes\",\"kind\":\"object\",\"type\":\"DashboardNote\",\"relationName\":\"DashboardNoteToUser\"},{\"name\":\"expenses\",\"kind\":\"object\",\"type\":\"Expense\",\"relationName\":\"ExpenseToUser\"},{\"name\":\"vouchers\",\"kind\":\"object\",\"type\":\"Voucher\",\"relationName\":\"UserToVoucher\"},{\"name\":\"journalEntries\",\"kind\":\"object\",\"type\":\"JournalEntry\",\"relationName\":\"JournalEntryToUser\"},{\"name\":\"followUps\",\"kind\":\"object\",\"type\":\"FollowUp\",\"relationName\":\"FollowUpToUser\"},{\"name\":\"createdPairs\",\"kind\":\"object\",\"type\":\"InventoryPair\",\"relationName\":\"PairCreatedBy\"},{\"name\":\"confirmedPairs\",\"kind\":\"object\",\"type\":\"InventoryPair\",\"relationName\":\"PairConfirmedBy\"},{\"name\":\"createdSets\",\"kind\":\"object\",\"type\":\"InventorySet\",\"relationName\":\"SetCreatedBy\"},{\"name\":\"confirmedSets\",\"kind\":\"object\",\"type\":\"InventorySet\",\"relationName\":\"SetConfirmedBy\"}],\"dbName\":null},\"Notification\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"eventKey\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"message\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"href\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"readAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"NotificationToUser\"}],\"dbName\":null},\"Permission\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"module\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"action\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"key\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"rolePermissions\",\"kind\":\"object\",\"type\":\"RolePermission\",\"relationName\":\"PermissionToRolePermission\"},{\"name\":\"userPermissions\",\"kind\":\"object\",\"type\":\"UserPermission\",\"relationName\":\"PermissionToUserPermission\"}],\"dbName\":null},\"Role\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"isSystem\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"isActive\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"RoleToUser\"},{\"name\":\"permissions\",\"kind\":\"object\",\"type\":\"RolePermission\",\"relationName\":\"RoleToRolePermission\"}],\"dbName\":null},\"RolePermission\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"roleId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"permissionId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"role\",\"kind\":\"object\",\"type\":\"Role\",\"relationName\":\"RoleToRolePermission\"},{\"name\":\"permission\",\"kind\":\"object\",\"type\":\"Permission\",\"relationName\":\"PermissionToRolePermission\"}],\"dbName\":null},\"UserPermission\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"permissionId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"allow\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"UserToUserPermission\"},{\"name\":\"permission\",\"kind\":\"object\",\"type\":\"Permission\",\"relationName\":\"PermissionToUserPermission\"}],\"dbName\":null},\"InventoryMetrics\":{\"fields\":[{\"name\":\"inventoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"daysInStock\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"memoDays\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"lastUpdated\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"LandingPageSettings\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"brandTitle\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subtitle\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"accessNotice\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"highlightsEnabled\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"whatsNewEnabled\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"highlights\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"whatsNewText\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"whatsNewUpdatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"activeVersion\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"updatedByUserId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"LandingPageVersion\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"versionNumber\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"snapshot\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdByUserId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"isRollback\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"createdBy\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"LandingPageVersionToUser\"}],\"dbName\":null},\"WhatsNewEntry\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"message\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"CategoryCode\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"inventories\",\"kind\":\"object\",\"type\":\"Inventory\",\"relationName\":\"CategoryCodeToInventory\"}],\"dbName\":null},\"GemstoneCode\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"inventories\",\"kind\":\"object\",\"type\":\"Inventory\",\"relationName\":\"GemstoneCodeToInventory\"}],\"dbName\":null},\"ColorCode\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"inventories\",\"kind\":\"object\",\"type\":\"Inventory\",\"relationName\":\"ColorCodeToInventory\"}],\"dbName\":null},\"CutCode\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"inventories\",\"kind\":\"object\",\"type\":\"Inventory\",\"relationName\":\"CutCodeToInventory\"}],\"dbName\":null},\"ShapeCode\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"CollectionCode\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"inventories\",\"kind\":\"object\",\"type\":\"Inventory\",\"relationName\":\"CollectionCodeToInventory\"}],\"dbName\":null},\"RashiCode\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"inventories\",\"kind\":\"object\",\"type\":\"Inventory\",\"relationName\":\"InventoryToRashiCode\"}],\"dbName\":null},\"CertificateCode\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"remarks\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"inventories\",\"kind\":\"object\",\"type\":\"Inventory\",\"relationName\":\"CertificateCodeToInventory\"}],\"dbName\":null},\"Vendor\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"phone\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"address\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"city\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"state\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"country\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"vendorType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"gstin\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"pan\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"purchases\",\"kind\":\"object\",\"type\":\"Purchase\",\"relationName\":\"PurchaseToVendor\"},{\"name\":\"inventories\",\"kind\":\"object\",\"type\":\"Inventory\",\"relationName\":\"InventoryToVendor\"}],\"dbName\":null},\"Customer\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"phone\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"phoneSecondary\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"address\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"city\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"state\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"country\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"pincode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"pan\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"gstin\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"assignedSalesperson\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"interestedIn\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"budgetRange\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"whatsappNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"preferredContact\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"stateCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"countryCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"isInternational\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"quotations\",\"kind\":\"object\",\"type\":\"Quotation\",\"relationName\":\"CustomerToQuotation\"},{\"name\":\"sales\",\"kind\":\"object\",\"type\":\"Sale\",\"relationName\":\"CustomerToSale\"},{\"name\":\"creditNotes\",\"kind\":\"object\",\"type\":\"CreditNote\",\"relationName\":\"CreditNoteToCustomer\"},{\"name\":\"advances\",\"kind\":\"object\",\"type\":\"CustomerAdvance\",\"relationName\":\"CustomerToCustomerAdvance\"}],\"dbName\":null},\"CustomerAdvance\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customer\",\"kind\":\"object\",\"type\":\"Customer\",\"relationName\":\"CustomerToCustomerAdvance\"},{\"name\":\"amount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"paymentMode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"paymentRef\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"isAdjusted\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"adjustedAmount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"remainingAmount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"adjustments\",\"kind\":\"object\",\"type\":\"CustomerAdvanceAdjustment\",\"relationName\":\"CustomerAdvanceToCustomerAdvanceAdjustment\"}],\"dbName\":null},\"CustomerAdvanceAdjustment\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"advanceId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"advance\",\"kind\":\"object\",\"type\":\"CustomerAdvance\",\"relationName\":\"CustomerAdvanceToCustomerAdvanceAdjustment\"},{\"name\":\"saleId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sale\",\"kind\":\"object\",\"type\":\"Sale\",\"relationName\":\"CustomerAdvanceAdjustmentToSale\"},{\"name\":\"amountUsed\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Inventory\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sku\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"itemName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"internalName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"category\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"gemType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"stoneType\",\"kind\":\"scalar\",\"type\":\"String\",\"dbName\":\"stone_type\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"productDescription\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"etsyDescription\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"pieces\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"weightValue\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"weightUnit\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"carats\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"weightRatti\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"weightGrams\",\"kind\":\"scalar\",\"type\":\"Float\",\"dbName\":\"weight_grams\"},{\"name\":\"costPrice\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"sellingPrice\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"profit\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"condition\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"hideFromAttention\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"location\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"certificateNo\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"certificateNumber\",\"kind\":\"scalar\",\"type\":\"String\",\"dbName\":\"certificate_number\"},{\"name\":\"certification\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"lab\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"certificateLab\",\"kind\":\"scalar\",\"type\":\"String\",\"dbName\":\"certificate_lab\"},{\"name\":\"shape\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"color\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"clarity\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"clarityGrade\",\"kind\":\"scalar\",\"type\":\"String\",\"dbName\":\"clarity_grade\"},{\"name\":\"cut\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"cutGrade\",\"kind\":\"scalar\",\"type\":\"String\",\"dbName\":\"cut_grade\"},{\"name\":\"polish\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"symmetry\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"fluorescence\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"measurements\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"dimensionsMm\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"tablePercent\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"depthPercent\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"ratio\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"origin\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"originCountry\",\"kind\":\"scalar\",\"type\":\"String\",\"dbName\":\"origin_country\"},{\"name\":\"treatment\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"cutPolishedIn\",\"kind\":\"scalar\",\"type\":\"String\",\"dbName\":\"cut_polished_in\"},{\"name\":\"qcCode\",\"kind\":\"scalar\",\"type\":\"String\",\"dbName\":\"qc_code\"},{\"name\":\"hsnCode\",\"kind\":\"scalar\",\"type\":\"String\",\"dbName\":\"hsn_code\"},{\"name\":\"transparency\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"braceletType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"standardSize\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"beadSizeMm\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"beadSizeLabel\",\"kind\":\"scalar\",\"type\":\"String\",\"dbName\":\"bead_size_label\"},{\"name\":\"beadCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"holeSizeMm\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"innerCircumferenceMm\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"pricingMode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sellingRatePerCarat\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"flatSellingPrice\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"purchaseRatePerCarat\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"flatPurchaseCost\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"certificateComments\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"stockLocation\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"salesReturnItems\",\"kind\":\"object\",\"type\":\"SalesReturnItem\",\"relationName\":\"InventoryToSalesReturnItem\"},{\"name\":\"purchaseId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"vendorId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"batchId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"imageUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"videoUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"rapPrice\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"discountPercent\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"categoryCodeId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"gemstoneCodeId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"colorCodeId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"cutCodeId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"collectionCodeId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"categoryCode\",\"kind\":\"object\",\"type\":\"CategoryCode\",\"relationName\":\"CategoryCodeToInventory\"},{\"name\":\"gemstoneCode\",\"kind\":\"object\",\"type\":\"GemstoneCode\",\"relationName\":\"GemstoneCodeToInventory\"},{\"name\":\"colorCode\",\"kind\":\"object\",\"type\":\"ColorCode\",\"relationName\":\"ColorCodeToInventory\"},{\"name\":\"cutCode\",\"kind\":\"object\",\"type\":\"CutCode\",\"relationName\":\"CutCodeToInventory\"},{\"name\":\"collectionCode\",\"kind\":\"object\",\"type\":\"CollectionCode\",\"relationName\":\"CollectionCodeToInventory\"},{\"name\":\"rashis\",\"kind\":\"object\",\"type\":\"RashiCode\",\"relationName\":\"InventoryToRashiCode\"},{\"name\":\"certificates\",\"kind\":\"object\",\"type\":\"CertificateCode\",\"relationName\":\"CertificateCodeToInventory\"},{\"name\":\"media\",\"kind\":\"object\",\"type\":\"InventoryMedia\",\"relationName\":\"InventoryToInventoryMedia\"},{\"name\":\"purchase\",\"kind\":\"object\",\"type\":\"Purchase\",\"relationName\":\"InventoryToPurchase\"},{\"name\":\"vendor\",\"kind\":\"object\",\"type\":\"Vendor\",\"relationName\":\"InventoryToVendor\"},{\"name\":\"listings\",\"kind\":\"object\",\"type\":\"Listing\",\"relationName\":\"InventoryToListing\"},{\"name\":\"metricSnapshots\",\"kind\":\"object\",\"type\":\"ListingMetricSnapshot\",\"relationName\":\"InventoryToListingMetricSnapshot\"},{\"name\":\"opportunities\",\"kind\":\"object\",\"type\":\"ListingOpportunity\",\"relationName\":\"InventoryToListingOpportunity\"},{\"name\":\"sales\",\"kind\":\"object\",\"type\":\"Sale\",\"relationName\":\"InventoryToSale\"},{\"name\":\"memoItems\",\"kind\":\"object\",\"type\":\"MemoItem\",\"relationName\":\"InventoryToMemoItem\"},{\"name\":\"quotationItems\",\"kind\":\"object\",\"type\":\"QuotationItem\",\"relationName\":\"InventoryToQuotationItem\"},{\"name\":\"labelCartItems\",\"kind\":\"object\",\"type\":\"LabelCartItem\",\"relationName\":\"InventoryToLabelCartItem\"},{\"name\":\"packagingCartItems\",\"kind\":\"object\",\"type\":\"PackagingCartItem\",\"relationName\":\"InventoryToPackagingCartItem\"},{\"name\":\"serializedUnits\",\"kind\":\"object\",\"type\":\"SerializedUnit\",\"relationName\":\"InventoryToSerializedUnit\"},{\"name\":\"pairsAsA\",\"kind\":\"object\",\"type\":\"InventoryPair\",\"relationName\":\"PairA\"},{\"name\":\"pairsAsB\",\"kind\":\"object\",\"type\":\"InventoryPair\",\"relationName\":\"PairB\"},{\"name\":\"setItems\",\"kind\":\"object\",\"type\":\"InventorySetItem\",\"relationName\":\"InventoryToInventorySetItem\"}],\"dbName\":null},\"InventoryPair\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventoryIdA\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventoryIdB\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"matchType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"score\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"matchDetails\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"suggestedPrice\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"createdById\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"confirmedById\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"confirmedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"soldAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"inventoryA\",\"kind\":\"object\",\"type\":\"Inventory\",\"relationName\":\"PairA\"},{\"name\":\"inventoryB\",\"kind\":\"object\",\"type\":\"Inventory\",\"relationName\":\"PairB\"},{\"name\":\"createdBy\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"PairCreatedBy\"},{\"name\":\"confirmedBy\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"PairConfirmedBy\"}],\"dbName\":null},\"InventorySet\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"matchType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"itemCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"score\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"matchDetails\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"suggestedPrice\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"createdById\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"confirmedById\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"confirmedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"soldAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"items\",\"kind\":\"object\",\"type\":\"InventorySetItem\",\"relationName\":\"InventorySetToInventorySetItem\"},{\"name\":\"createdBy\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"SetCreatedBy\"},{\"name\":\"confirmedBy\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"SetConfirmedBy\"}],\"dbName\":null},\"InventorySetItem\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"setId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"position\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"set\",\"kind\":\"object\",\"type\":\"InventorySet\",\"relationName\":\"InventorySetToInventorySetItem\"},{\"name\":\"inventory\",\"kind\":\"object\",\"type\":\"Inventory\",\"relationName\":\"InventoryToInventorySetItem\"}],\"dbName\":null},\"InventoryMedia\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"mediaUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"isPrimary\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"inventory\",\"kind\":\"object\",\"type\":\"Inventory\",\"relationName\":\"InventoryToInventoryMedia\"}],\"dbName\":null},\"Purchase\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"invoiceNo\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"purchaseDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"vendorId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"totalAmount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"paymentStatus\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"paymentMode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"items\",\"kind\":\"object\",\"type\":\"Inventory\",\"relationName\":\"InventoryToPurchase\"},{\"name\":\"vendor\",\"kind\":\"object\",\"type\":\"Vendor\",\"relationName\":\"PurchaseToVendor\"},{\"name\":\"purchaseItems\",\"kind\":\"object\",\"type\":\"PurchaseItem\",\"relationName\":\"PurchaseToPurchaseItem\"},{\"name\":\"payments\",\"kind\":\"object\",\"type\":\"PurchasePayment\",\"relationName\":\"PurchaseToPurchasePayment\"}],\"dbName\":null},\"PurchaseItem\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"purchaseId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"itemName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"category\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"shape\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"dimensions\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"beadSizeMm\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"weightValue\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"weightUnit\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"quantity\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"unitCost\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"totalCost\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"purchase\",\"kind\":\"object\",\"type\":\"Purchase\",\"relationName\":\"PurchaseToPurchaseItem\"}],\"dbName\":null},\"PurchasePayment\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"purchaseId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"amount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"date\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"method\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"reference\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"chequeNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bankName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"chequePayee\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"chequeDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"purchase\",\"kind\":\"object\",\"type\":\"Purchase\",\"relationName\":\"PurchaseToPurchasePayment\"}],\"dbName\":null},\"Listing\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"platform\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"externalId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"listedPrice\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"currency\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"listedDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"listingUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"listingRef\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"listingSku\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"marketplaceTitle\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"marketplacePrice\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"marketplaceQuantity\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"marketplaceViews\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"marketplaceFavorites\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"marketplaceOrders\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"marketplaceShopName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"marketplaceShopId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"syncStatus\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"syncError\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"lastSyncedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"rawMetadata\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventory\",\"kind\":\"object\",\"type\":\"Inventory\",\"relationName\":\"InventoryToListing\"},{\"name\":\"marketplaceShop\",\"kind\":\"object\",\"type\":\"MarketplaceShop\",\"relationName\":\"ListingToMarketplaceShop\"},{\"name\":\"priceHistory\",\"kind\":\"object\",\"type\":\"ListingPriceHistory\",\"relationName\":\"ListingToListingPriceHistory\"}],\"dbName\":null},\"ListingPriceHistory\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"listingId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"price\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"changedBy\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"changedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"listing\",\"kind\":\"object\",\"type\":\"Listing\",\"relationName\":\"ListingToListingPriceHistory\"}],\"dbName\":null},\"ListingMetricSnapshot\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"marketplace\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"externalId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"capturedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"views\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"watches\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"favourites\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"orders\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"revenue\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"currency\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"rawPayload\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"source\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventory\",\"kind\":\"object\",\"type\":\"Inventory\",\"relationName\":\"InventoryToListingMetricSnapshot\"}],\"dbName\":null},\"ListingOpportunity\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"marketplace\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"externalId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"currentViews\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"currentWatches\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"currentFavourites\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"currentOrders\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"currentRevenue\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"currency\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"lastSyncedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"inventory\",\"kind\":\"object\",\"type\":\"Inventory\",\"relationName\":\"InventoryToListingOpportunity\"}],\"dbName\":null},\"Sale\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"orderId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerEmail\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerPhone\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerAddress\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"billingAddress\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerCity\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"placeOfSupply\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"shippingAddress\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"shippingCharge\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"additionalCharge\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"saleDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"salePrice\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"usdPrice\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"taxAmount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"discountAmount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"netAmount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"paymentStatus\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"paymentMethod\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"platform\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"invoiceId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"legacyInvoiceId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"costPriceSnapshot\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"profit\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"actualProfit\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"internalShippingCost\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"internalPackagingCost\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"internalInsuranceCost\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"internalHandlingCost\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"internalOtherCharges\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"internalCostTotal\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"listedSku\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"fulfillmentSku\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"fulfillmentReason\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"marketplaceOrderItemId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customer\",\"kind\":\"object\",\"type\":\"Customer\",\"relationName\":\"CustomerToSale\"},{\"name\":\"inventory\",\"kind\":\"object\",\"type\":\"Inventory\",\"relationName\":\"InventoryToSale\"},{\"name\":\"invoice\",\"kind\":\"object\",\"type\":\"Invoice\",\"relationName\":\"NewInvoice\"},{\"name\":\"legacyInvoice\",\"kind\":\"object\",\"type\":\"Invoice\",\"relationName\":\"LegacyInvoice\"},{\"name\":\"advanceAdjustments\",\"kind\":\"object\",\"type\":\"CustomerAdvanceAdjustment\",\"relationName\":\"CustomerAdvanceAdjustmentToSale\"}],\"dbName\":null},\"Memo\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"issueDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"expiryDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"items\",\"kind\":\"object\",\"type\":\"MemoItem\",\"relationName\":\"MemoToMemoItem\"}],\"dbName\":null},\"MemoItem\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"memoId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"memo\",\"kind\":\"object\",\"type\":\"Memo\",\"relationName\":\"MemoToMemoItem\"},{\"name\":\"inventory\",\"kind\":\"object\",\"type\":\"Inventory\",\"relationName\":\"InventoryToMemoItem\"}],\"dbName\":null},\"Quotation\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"quotationNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"token\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerEmail\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerMobile\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerAddress\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerCity\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"totalAmount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"validUntil\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"expiryDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdById\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"approvedById\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customer\",\"kind\":\"object\",\"type\":\"Customer\",\"relationName\":\"CustomerToQuotation\"},{\"name\":\"createdBy\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"CreatedQuotations\"},{\"name\":\"approvedBy\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"ApprovedQuotations\"},{\"name\":\"items\",\"kind\":\"object\",\"type\":\"QuotationItem\",\"relationName\":\"QuotationToQuotationItem\"},{\"name\":\"invoices\",\"kind\":\"object\",\"type\":\"Invoice\",\"relationName\":\"InvoiceToQuotation\"}],\"dbName\":null},\"QuotationItem\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"quotationId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"quotedPrice\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"quotation\",\"kind\":\"object\",\"type\":\"Quotation\",\"relationName\":\"QuotationToQuotationItem\"},{\"name\":\"inventory\",\"kind\":\"object\",\"type\":\"Inventory\",\"relationName\":\"InventoryToQuotationItem\"}],\"dbName\":null},\"Invoice\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"invoiceNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"token\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"quotationId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"isActive\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"dueDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"invoiceType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"iecCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"exportType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"countryOfDestination\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"portOfDispatch\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"modeOfTransport\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"courierPartner\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"trackingId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"invoiceCurrency\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"conversionRate\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"totalInrValue\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"internalShippingCost\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"internalPackagingCost\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"internalInsuranceCost\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"internalHandlingCost\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"internalOtherCharges\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"internalCostTotal\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"displayOptions\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subtotal\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"taxTotal\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"discountTotal\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"totalAmount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"paymentStatus\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"paidAmount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"invoiceDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"quotation\",\"kind\":\"object\",\"type\":\"Quotation\",\"relationName\":\"InvoiceToQuotation\"},{\"name\":\"sales\",\"kind\":\"object\",\"type\":\"Sale\",\"relationName\":\"NewInvoice\"},{\"name\":\"legacySale\",\"kind\":\"object\",\"type\":\"Sale\",\"relationName\":\"LegacyInvoice\"},{\"name\":\"versions\",\"kind\":\"object\",\"type\":\"InvoiceVersion\",\"relationName\":\"InvoiceToInvoiceVersion\"},{\"name\":\"payments\",\"kind\":\"object\",\"type\":\"Payment\",\"relationName\":\"InvoiceToPayment\"},{\"name\":\"followUps\",\"kind\":\"object\",\"type\":\"FollowUp\",\"relationName\":\"FollowUpToInvoice\"},{\"name\":\"salesReturns\",\"kind\":\"object\",\"type\":\"SalesReturn\",\"relationName\":\"InvoiceToSalesReturn\"},{\"name\":\"creditNotes\",\"kind\":\"object\",\"type\":\"CreditNote\",\"relationName\":\"CreditNoteToInvoice\"},{\"name\":\"exportInvoice\",\"kind\":\"object\",\"type\":\"ExportInvoice\",\"relationName\":\"ExportInvoiceToInvoice\"}],\"dbName\":null},\"ExportInvoice\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"invoiceId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customsDeclarationNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"fobValue\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"freightCharges\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"insuranceCharges\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"shippingBillNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"portCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"hsnCodes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"buyerReference\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"contractNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"preCarriageBy\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"preCarriagePort\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"invoice\",\"kind\":\"object\",\"type\":\"Invoice\",\"relationName\":\"ExportInvoiceToInvoice\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Payment\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"invoiceId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"amount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"date\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"method\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"reference\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"recordedBy\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"invoice\",\"kind\":\"object\",\"type\":\"Invoice\",\"relationName\":\"InvoiceToPayment\"}],\"dbName\":null},\"InventoryQrPaymentAuthorization\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"enabled\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"totalAmount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"amountToCollect\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"currency\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"allowPartial\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"paidAmount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"customerName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerEmail\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerPhone\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"orderReference\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"saleId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"updatedByUserId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"InventoryQrPaymentAttempt\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"authorizationId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"amount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"currency\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"razorpayOrderId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"razorpayPaymentId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"activeKey\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"failureReason\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"paidAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"InvoiceVersion\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"invoiceId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"versionNumber\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"reason\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"snapshot\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"invoice\",\"kind\":\"object\",\"type\":\"Invoice\",\"relationName\":\"InvoiceToInvoiceVersion\"}],\"dbName\":null},\"Setting\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"key\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"value\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"CompanySettings\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"companyName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"invoicePrefix\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"invoicingStartNumber\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"invoiceLogoUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"quotationLogoUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"logoUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"skuViewLogoUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"otherDocsLogoUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"address\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"phone\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"website\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"gstin\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"enableExportInvoice\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"defaultExportType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"companyIec\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"defaultCurrency\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"defaultPort\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"swiftCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"termsAndConditions\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"FollowUp\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"invoiceId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"date\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"channel\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"action\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"note\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"promisedDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"completedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"cancelledAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"rescheduledTo\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdById\",\"kind\":\"scalar\",\"type\":\"String\",\"dbName\":\"createdBy\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"invoice\",\"kind\":\"object\",\"type\":\"Invoice\",\"relationName\":\"FollowUpToInvoice\"},{\"name\":\"createdBy\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"FollowUpToUser\"}],\"dbName\":null},\"SalesReturn\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"invoiceId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"returnNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"returnDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"disposition\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"taxableAmount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"igst\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"cgst\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"sgst\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"totalTax\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"totalAmount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"remarks\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdById\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"invoice\",\"kind\":\"object\",\"type\":\"Invoice\",\"relationName\":\"InvoiceToSalesReturn\"},{\"name\":\"items\",\"kind\":\"object\",\"type\":\"SalesReturnItem\",\"relationName\":\"SalesReturnToSalesReturnItem\"}],\"dbName\":null},\"SalesReturnItem\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"salesReturnId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"quantity\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"sellingPrice\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"resaleable\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"salesReturn\",\"kind\":\"object\",\"type\":\"SalesReturn\",\"relationName\":\"SalesReturnToSalesReturnItem\"},{\"name\":\"inventory\",\"kind\":\"object\",\"type\":\"Inventory\",\"relationName\":\"InventoryToSalesReturnItem\"}],\"dbName\":null},\"CreditNote\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"invoiceId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"creditNoteNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"issueDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"totalAmount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"taxableAmount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"igst\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"cgst\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"sgst\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"totalTax\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"balanceAmount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"isActive\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"customer\",\"kind\":\"object\",\"type\":\"Customer\",\"relationName\":\"CreditNoteToCustomer\"},{\"name\":\"invoice\",\"kind\":\"object\",\"type\":\"Invoice\",\"relationName\":\"CreditNoteToInvoice\"}],\"dbName\":null},\"InvoiceSettings\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"prefix\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"currencySymbol\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"digitalSignatureUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"terms\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"exportTerms\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"footerNotes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"gstEnabled\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"gstType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"categoryGstRates\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"PaymentSettings\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"upiEnabled\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"upiId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"upiPayeeName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"upiQrUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bankEnabled\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"bankName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"accountNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"ifscCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"swiftCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"accountHolder\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"razorpayEnabled\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"razorpayKeyId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"razorpayKeySecret\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"razorpayButtonId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"ActivityLog\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"entityType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"entityId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"entityIdentifier\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"idempotencyKey\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"actionType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userEmail\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"ipAddress\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userAgent\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"source\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"fieldChanges\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"details\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"module\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"action\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"referenceId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"metadata\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"LabelPrintJob\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"layoutId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"printerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"printFormat\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"totalItems\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"LabelPrintJobToUser\"},{\"name\":\"items\",\"kind\":\"object\",\"type\":\"LabelPrintJobItem\",\"relationName\":\"LabelPrintJobToLabelPrintJobItem\"}],\"dbName\":null},\"LabelPrintJobItem\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"jobId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sku\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sellingPrice\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"priceWithChecksum\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"checksumDigit\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"checksumMethod\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"encodingVersion\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"internalName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"job\",\"kind\":\"object\",\"type\":\"LabelPrintJob\",\"relationName\":\"LabelPrintJobToLabelPrintJobItem\"}],\"dbName\":null},\"LabelCartItem\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"addedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"LabelCartItemToUser\"},{\"name\":\"inventory\",\"kind\":\"object\",\"type\":\"Inventory\",\"relationName\":\"InventoryToLabelCartItem\"}],\"dbName\":null},\"PackagingCartItem\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"quantity\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"location\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"addedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"PackagingCartItemToUser\"},{\"name\":\"inventory\",\"kind\":\"object\",\"type\":\"Inventory\",\"relationName\":\"InventoryToPackagingCartItem\"}],\"dbName\":null},\"SalesMarginAnalytics\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"period\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"startDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"endDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"revenue\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"cost\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"margin\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"SalesMarginAnalyticsToUser\"}],\"dbName\":null},\"ReportExportJob\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"reportType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"format\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"dateFrom\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"dateTo\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"filtersJson\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"requestedById\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"requestedBy\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"downloadUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"errorMessage\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"WorkerLockHeartbeat\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"ownerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"leaseUntil\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"heartbeatAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"AnalyticsDailySnapshot\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"snapshotDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"inventoryCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"inventoryValueCost\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"inventoryValueSell\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"salesCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"salesRevenue\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"profitAmount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"invoiceCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"pendingInvoices\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"paymentReceived\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"AnalyticsInventorySnapshot\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sku\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"itemName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"category\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"vendorName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"purchaseCost\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"sellingPrice\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"daysInStock\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"ageBucket\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"AnalyticsVendorSnapshot\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"vendorId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"snapshotDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"vendorName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"totalItemsSupplied\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"totalPurchaseValue\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"inventoryInStock\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"inventoryValue\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"lastPurchaseDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"AnalyticsSalesSnapshot\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"saleId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sku\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"itemName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"category\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"purchaseCost\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"sellingPrice\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"profitAmount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"saleDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"saleCycleDays\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"AnalyticsLabelSnapshot\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"jobId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"printedBy\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"labelsPrinted\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"printedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"PriceOverrideAudit\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"originalPrice\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"newPrice\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"reason\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"approvedBy\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"PriceOverrideAuditToUser\"}],\"dbName\":null},\"DashboardNote\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"content\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"color\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"position\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"createdById\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdBy\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"DashboardNoteToUser\"}],\"dbName\":null},\"ExpenseCategory\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"gstAllowed\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"expenses\",\"kind\":\"object\",\"type\":\"Expense\",\"relationName\":\"ExpenseToExpenseCategory\"}],\"dbName\":null},\"Voucher\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"voucherNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"voucherType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"voucherDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"referenceId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"narration\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"amount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"isReversed\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"reversalReason\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdById\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdBy\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"UserToVoucher\"},{\"name\":\"expense\",\"kind\":\"object\",\"type\":\"Expense\",\"relationName\":\"ExpenseToVoucher\"}],\"dbName\":null},\"Expense\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"expenseDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"categoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"vendorName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"referenceNo\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"totalAmount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"paymentMode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"paymentStatus\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"paidAmount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"paymentDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"paymentRef\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"attachmentUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"voucherId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdById\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"voucher\",\"kind\":\"object\",\"type\":\"Voucher\",\"relationName\":\"ExpenseToVoucher\"},{\"name\":\"category\",\"kind\":\"object\",\"type\":\"ExpenseCategory\",\"relationName\":\"ExpenseToExpenseCategory\"},{\"name\":\"createdBy\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"ExpenseToUser\"}],\"dbName\":null},\"Account\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subtype\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"isActive\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"journalLines\",\"kind\":\"object\",\"type\":\"JournalLine\",\"relationName\":\"AccountToJournalLine\"}],\"dbName\":null},\"JournalEntry\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"date\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"referenceType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"referenceId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdById\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"isReversed\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"lines\",\"kind\":\"object\",\"type\":\"JournalLine\",\"relationName\":\"JournalEntryToJournalLine\"},{\"name\":\"createdBy\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"JournalEntryToUser\"}],\"dbName\":null},\"JournalLine\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"journalEntryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"accountId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"debit\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"credit\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"journalEntry\",\"kind\":\"object\",\"type\":\"JournalEntry\",\"relationName\":\"JournalEntryToJournalLine\"},{\"name\":\"account\",\"kind\":\"object\",\"type\":\"Account\",\"relationName\":\"AccountToJournalLine\"}],\"dbName\":null},\"SerializedUnit\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sku\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"serialNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"fullHash\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"shortHash\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"packagingStatus\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"printCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"qrScanCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"firstScanAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"lastScanAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdById\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"printedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"printedById\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"soldAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"returnedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"voidReason\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"isActive\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"inventory\",\"kind\":\"object\",\"type\":\"Inventory\",\"relationName\":\"InventoryToSerializedUnit\"},{\"name\":\"createdBy\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"CreatedSerials\"},{\"name\":\"printedBy\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"PrintedSerials\"},{\"name\":\"logs\",\"kind\":\"object\",\"type\":\"SerialActivityLog\",\"relationName\":\"SerialActivityLogToSerializedUnit\"}],\"dbName\":null},\"SerialActivityLog\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"serialId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"actionType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"ipAddress\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userAgent\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"timestamp\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"metadata\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"serial\",\"kind\":\"object\",\"type\":\"SerializedUnit\",\"relationName\":\"SerialActivityLogToSerializedUnit\"}],\"dbName\":null},\"GpisSettings\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"brandName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"tagline\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"estYear\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"registeredAddress\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"gstin\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"iec\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"supportEmail\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"supportPhone\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"supportTimings\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"website\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"categoryHsnJson\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"showRegisteredAddress\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"showGstin\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"showIec\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"showSupport\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"showWatermark\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"watermarkText\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"watermarkOpacity\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"watermarkRotation\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"watermarkFontSize\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"watermarkFontFamily\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"labelFontFamily\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"microBorderText\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"toleranceCarat\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"toleranceGram\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"labelVersion\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"logoUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"careInstruction\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"legalMetrologyLine\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"EbaySettings\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"globalBannerImages\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"categoryImageUrls\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"categoryGemtypeImageUrls\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"maxImagesPerCategory\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"imagesPerDescription\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"imageRotationMode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"brandLogoUrl\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"companyName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"tagline\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"GpisLayoutPreset\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"unit\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"pageWidthMm\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"pageHeightMm\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"cols\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"rows\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"labelWidthMm\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"labelHeightMm\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"marginLeftMm\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"marginTopMm\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"gapXmm\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"gapYmm\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"offsetXmm\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"offsetYmm\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"startPosition\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"selectedFieldsJson\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"isDefault\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":\"gpis_layout_presets\"},\"GpisSerial\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sku\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"serialNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"categoryCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"yearMonth\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"runningNumber\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"hashFragment\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventoryLocation\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"qcCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"packedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"packingDate\",\"kind\":\"scalar\",\"type\":\"DateTime\",\"dbName\":\"packing_date\"},{\"name\":\"reprintCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"labelVersion\",\"kind\":\"scalar\",\"type\":\"String\",\"dbName\":\"label_version\"},{\"name\":\"unitQuantity\",\"kind\":\"scalar\",\"type\":\"Int\",\"dbName\":\"unit_quantity\"},{\"name\":\"madeIn\",\"kind\":\"scalar\",\"type\":\"String\",\"dbName\":\"made_in\"},{\"name\":\"declaredOriginal\",\"kind\":\"scalar\",\"type\":\"Boolean\",\"dbName\":\"declared_original\"},{\"name\":\"createdBy\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"printJobItems\",\"kind\":\"object\",\"type\":\"GpisPrintJobItem\",\"relationName\":\"GpisPrintJobItemToGpisSerial\"}],\"dbName\":null},\"GpisPrintJob\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"printJobId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sku\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"startSerial\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"endSerial\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"totalLabels\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"printerType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"printedBy\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"printedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"supersededById\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"supersededAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"items\",\"kind\":\"object\",\"type\":\"GpisPrintJobItem\",\"relationName\":\"GpisPrintJobToGpisPrintJobItem\"}],\"dbName\":null},\"GpisPrintJobItem\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"printJobId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"serialId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"serialNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sku\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"printJob\",\"kind\":\"object\",\"type\":\"GpisPrintJob\",\"relationName\":\"GpisPrintJobToGpisPrintJobItem\"},{\"name\":\"serial\",\"kind\":\"object\",\"type\":\"GpisSerial\",\"relationName\":\"GpisPrintJobItemToGpisSerial\"}],\"dbName\":\"gpis_print_job_items\"},\"GpisVerificationLog\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"serialNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"scannedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"ipAddress\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userAgent\",\"kind\":\"scalar\",\"type\":\"String\"}],\"dbName\":null},\"CertificateCodeToInventory\":{\"fields\":[{\"name\":\"A\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"B\",\"kind\":\"scalar\",\"type\":\"String\"}],\"dbName\":\"_CertificateCodeToInventory\"},\"InventoryToRashiCode\":{\"fields\":[{\"name\":\"A\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"B\",\"kind\":\"scalar\",\"type\":\"String\"}],\"dbName\":\"_InventoryToRashiCode\"},\"StateCode\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"PriceRecommendationLog\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"suggestedSellingRate\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"suggestedSellingPrice\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"suggestedPurchaseRate\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"appliedSellingRate\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"appliedSellingPrice\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"appliedPurchaseRate\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"sellingDeviationPct\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"purchaseDeviationPct\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"confidence\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"matchLevel\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sampleCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"minRate\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"maxRate\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"recommendationSnapshot\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"MarketplaceProfile\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"displayName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"currency\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"isActive\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"isDefault\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"marginType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"marginValue\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"charges\",\"kind\":\"object\",\"type\":\"MarketplaceCharge\",\"relationName\":\"MarketplaceChargeToMarketplaceProfile\"}],\"dbName\":null},\"MarketplaceCharge\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"profileId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"chargeKey\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"enabled\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"amountType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"amount\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"countryCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sortOrder\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"profile\",\"kind\":\"object\",\"type\":\"MarketplaceProfile\",\"relationName\":\"MarketplaceChargeToMarketplaceProfile\"}],\"dbName\":null},\"CurrencyRate\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"rateToInr\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"isBase\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"MarketplaceConnection\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"marketplace\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"externalAccountId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"authType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"oauthAppProfile\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"clientId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"tokenRef\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"scopes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"lastConnectedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"shops\",\"kind\":\"object\",\"type\":\"MarketplaceShop\",\"relationName\":\"MarketplaceConnectionToMarketplaceShop\"}],\"dbName\":null},\"MarketplaceShop\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"connectionId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"marketplace\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"externalShopId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"connection\",\"kind\":\"object\",\"type\":\"MarketplaceConnection\",\"relationName\":\"MarketplaceConnectionToMarketplaceShop\"},{\"name\":\"listings\",\"kind\":\"object\",\"type\":\"Listing\",\"relationName\":\"ListingToMarketplaceShop\"},{\"name\":\"orders\",\"kind\":\"object\",\"type\":\"MarketplaceOrder\",\"relationName\":\"MarketplaceOrderToMarketplaceShop\"},{\"name\":\"syncLogs\",\"kind\":\"object\",\"type\":\"MarketplaceSyncLog\",\"relationName\":\"MarketplaceShopToMarketplaceSyncLog\"},{\"name\":\"syncJobs\",\"kind\":\"object\",\"type\":\"MarketplaceSyncJob\",\"relationName\":\"MarketplaceShopToMarketplaceSyncJob\"}],\"dbName\":null},\"MarketplaceSyncLog\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"marketplace\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"syncType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"startedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"endedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"recordsScanned\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"recordsCreated\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"recordsUpdated\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"recordsSkipped\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"recordsFailed\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"errorDetails\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"triggeredBy\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"marketplaceShopId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"marketplaceShop\",\"kind\":\"object\",\"type\":\"MarketplaceShop\",\"relationName\":\"MarketplaceShopToMarketplaceSyncLog\"}],\"dbName\":null},\"MarketplaceSyncJob\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"marketplaceShopId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"syncType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"progressStep\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"progressDetail\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"cursor\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"recordsScanned\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"recordsCreated\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"recordsUpdated\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"recordsSkipped\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"recordsFailed\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"attempts\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"errorDetails\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"requestedById\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"requestedBy\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"batchId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"startedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"endedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"marketplaceShop\",\"kind\":\"object\",\"type\":\"MarketplaceShop\",\"relationName\":\"MarketplaceShopToMarketplaceSyncJob\"}],\"dbName\":null},\"EbayWebhookNotification\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"notificationId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"topic\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"ebayUserId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"ebayUsername\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"signatureValid\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"receivedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"processedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"errorDetails\",\"kind\":\"scalar\",\"type\":\"String\"}],\"dbName\":null},\"MarketplaceOrder\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"marketplace\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"marketplaceOrderId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"orderNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"marketplaceShopName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"marketplaceShopId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"buyerName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"buyerEmail\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"buyerCountry\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"buyerCity\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"buyerState\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"buyerZip\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"trackingCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"carrier\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"orderTotal\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"currency\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"orderDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"rawMetadata\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"lastSyncedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"items\",\"kind\":\"object\",\"type\":\"MarketplaceOrderItem\",\"relationName\":\"MarketplaceOrderToMarketplaceOrderItem\"},{\"name\":\"marketplaceShop\",\"kind\":\"object\",\"type\":\"MarketplaceShop\",\"relationName\":\"MarketplaceOrderToMarketplaceShop\"}],\"dbName\":null},\"MarketplaceOrderItem\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"orderId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"marketplaceItemId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"listedSku\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"listedTitle\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"quantity\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"unitPrice\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"currency\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"fulfillmentSku\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"fulfillmentReason\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"rawMetadata\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"order\",\"kind\":\"object\",\"type\":\"MarketplaceOrder\",\"relationName\":\"MarketplaceOrderToMarketplaceOrderItem\"}],\"dbName\":null},\"Document\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"orderId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"saleId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"invoiceId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"fileName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"mimeType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sizeBytes\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"storageProvider\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"storageRef\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"certificateNumber\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"errorMessage\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"EmailLog\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"customerId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"orderId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"templateKey\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"recipient\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"cc\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bcc\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subject\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bodyRef\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bodyHtml\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"bodyText\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"payloadJson\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"retryHistoryJson\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"idempotencyKey\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"threadId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"messageId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inReplyTo\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"referencesJson\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"emailType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"direction\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"provider\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"providerMessageId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"attemptCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"lastAttemptAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"nextRetryAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"lastError\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"failureCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"processingStartedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"queuedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"sentAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"deliveredAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"openedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"bouncedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"failedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"cancelledAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"isRead\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"readAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"errorMessage\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"attachmentsJson\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"receivedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"EmailProviderEvent\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"eventId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"communicationId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"providerMessageId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"eventType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"occurredAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"receivedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"WorkSession\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"platform\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"activityType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sku\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"marketplaceListingId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"inventoryId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"marketplaceShopId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"listingRecordId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"startedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"endedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"durationSeconds\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"trackingSource\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"notes\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"requestId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"activeUserId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"revision\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"UserToWorkSession\"},{\"name\":\"intervals\",\"kind\":\"object\",\"type\":\"WorkInterval\",\"relationName\":\"WorkIntervalToWorkSession\"},{\"name\":\"events\",\"kind\":\"object\",\"type\":\"WorkActivityEvent\",\"relationName\":\"WorkActivityEventToWorkSession\"}],\"dbName\":null},\"WorkInterval\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sessionId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"startedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"endedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"session\",\"kind\":\"object\",\"type\":\"WorkSession\",\"relationName\":\"WorkIntervalToWorkSession\"}],\"dbName\":null},\"WorkTarget\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"platform\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"period\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"targetMinutes\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"UserToWorkTarget\"}],\"dbName\":null},\"WorkActivityEvent\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"platform\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"domain\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"eventType\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"occurredAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"durationSeconds\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"source\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"sessionId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"UserToWorkActivityEvent\"},{\"name\":\"session\",\"kind\":\"object\",\"type\":\"WorkSession\",\"relationName\":\"WorkActivityEventToWorkSession\"}],\"dbName\":null},\"WorkTrackerCredential\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"tokenHash\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"expiresAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"revokedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"UserToWorkTrackerCredential\"}],\"dbName\":null},\"WeeklyReportRun\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"executionKey\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"mode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"periodStart\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"periodEnd\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"timezone\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"scheduledFor\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"configHash\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"settingsJson\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"metricsJson\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"dataQuality\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"pdfBase64\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"pdfChecksum\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"pdfBytes\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"attempts\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"leaseOwner\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"leaseUntil\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"nextAttemptAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"requestedById\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"errorCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"errorSummary\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"startedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"completedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"deliveries\",\"kind\":\"object\",\"type\":\"WeeklyReportDelivery\",\"relationName\":\"WeeklyReportDeliveryToWeeklyReportRun\"}],\"dbName\":null},\"WeeklyReportDelivery\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"runId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"recipient\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"status\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"attempts\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"attemptedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"acceptedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"nextAttemptAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"providerMessageId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"emailLogId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"errorCode\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"errorSummary\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"run\",\"kind\":\"object\",\"type\":\"WeeklyReportRun\",\"relationName\":\"WeeklyReportDeliveryToWeeklyReportRun\"}],\"dbName\":null}},\"enums\":{},\"types\":{}}")
defineDmmfProperty(exports.Prisma, config.runtimeDataModel)
config.engineWasm = {
  getRuntime: () => require('./query_engine_bg.js'),
  getQueryEngineWasmModule: async () => {
    const loader = (await import('#wasm-engine-loader')).default
    const engine = (await loader).default
    return engine 
  }
}

config.injectableEdgeEnv = () => ({
  parsed: {
    DATABASE_URL: typeof globalThis !== 'undefined' && globalThis['DATABASE_URL'] || typeof process !== 'undefined' && process.env && process.env.DATABASE_URL || undefined
  }
})

if (typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined) {
  Debug.enable(typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined)
}

const PrismaClient = getPrismaClient(config)
exports.PrismaClient = PrismaClient
Object.assign(exports, Prisma)

