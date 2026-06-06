-- Add categoryGemtypeImageUrls column to EbaySettings
ALTER TABLE `EbaySettings` ADD COLUMN `categoryGemtypeImageUrls` VARCHAR(8191) DEFAULT '{}';

-- Update imagesPerDescription from 2 to 3
UPDATE `EbaySettings` SET `imagesPerDescription` = 3 WHERE `imagesPerDescription` = 2;
