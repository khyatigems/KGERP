CREATE TABLE IF NOT EXISTS WebsiteMigration (id TEXT PRIMARY KEY, checksum TEXT NOT NULL, appliedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS WebsiteRecord (id TEXT PRIMARY KEY, section TEXT NOT NULL CHECK(section IN ('products','collections','offers','banners','announcements','checkout')), payload TEXT NOT NULL CHECK(json_valid(payload)), revision INTEGER NOT NULL DEFAULT 1, createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS WebsiteRecord_section ON WebsiteRecord(section);
CREATE TABLE IF NOT EXISTS WebsiteAudit (id TEXT PRIMARY KEY, recordId TEXT NOT NULL REFERENCES WebsiteRecord(id), actor TEXT NOT NULL, payload TEXT NOT NULL, createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
