
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


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

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

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
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
