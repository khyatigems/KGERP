CREATE TABLE IF NOT EXISTS WebsiteOrder (
  id TEXT PRIMARY KEY,
  razorpayOrderId TEXT NOT NULL UNIQUE,
  razorpayPaymentId TEXT UNIQUE,
  status TEXT NOT NULL CHECK(status IN ('pending','paid')),
  mode TEXT NOT NULL CHECK(mode IN ('test','live')),
  amountPaise INTEGER NOT NULL CHECK(amountPaise > 0),
  payload TEXT NOT NULL CHECK(json_valid(payload)),
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS WebsiteOrder_createdAt ON WebsiteOrder(createdAt DESC);
