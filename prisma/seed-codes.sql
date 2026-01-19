-- CATEGORY CODES
INSERT OR IGNORE INTO CategoryCode (id, name, code, status, createdAt, updatedAt) VALUES
  ('cat-lg', 'Loose Gemstone', 'LG', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-br', 'Bracelet',       'BR', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-rg', 'Ring',           'RG', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-pd', 'Pendant',        'PD', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-fg', 'Figure / Idol',  'FG', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-sc', 'Seven Chakra',   'SC', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-bd', 'Beads',          'BD', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-ch', 'Chips',          'CH', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-rr', 'Raw / Rough',    'RR', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- GEMSTONE CODES (sample – extend as needed)
INSERT OR IGNORE INTO GemstoneCode (id, name, code, status, createdAt, updatedAt) VALUES
  ('gem-dmd', 'Diamond',        'DMD', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('gem-sap', 'Sapphire',       'SAP', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('gem-emd', 'Emerald',        'EMD', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('gem-amt', 'Amethyst',       'AMT', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('gem-aqu', 'Aquamarine',     'AQU', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('gem-rub', 'Ruby_Manik',     'RUB', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- COLOR CODES
INSERT OR IGNORE INTO ColorCode (id, name, code, status, createdAt, updatedAt) VALUES
  ('col-blu', 'Blue',       'BLU', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('col-red', 'Red',        'RED', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('col-grn', 'Green',      'GRN', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('col-ylw', 'Yellow',     'YLW', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('col-mlt', 'Multicolor', 'MLT', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
