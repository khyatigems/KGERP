/**
 * MOD-9 Price Checksum Encoding
 * 
 * Logic:
 * 1. Normalize price (integer, no decimals)
 * 2. Calculate checksum = (sum of digits) % 9
 * 3. Append checksum to price
 * 
 * Example: 7850 -> 7+8+5+0=20 -> 20%9=2 -> 78502
 */

export interface EncodedPriceData {
    originalPrice: number;
    priceWithChecksum: string;
    checksumDigit: number;
    isValid: boolean;
}

export function encodePrice(price: number): EncodedPriceData {
    const normalizedPrice = Math.round(Math.abs(price));
    const priceStr = normalizedPrice.toString();
    
    let sum = 0;
    for (const char of priceStr) {
        sum += parseInt(char, 10);
    }
    
    const checksum = sum % 9;
    
    return {
        originalPrice: normalizedPrice,
        priceWithChecksum: `${priceStr}${checksum}`,
        checksumDigit: checksum,
        isValid: true
    };
}

export function validatePrice(encodedPrice: string): boolean {
    if (!encodedPrice || encodedPrice.length < 2) return false;
    
    // Extract checksum (last digit)
    const providedChecksum = parseInt(encodedPrice.slice(-1), 10);
    const basePriceStr = encodedPrice.slice(0, -1);
    
    // Recalculate checksum
    let sum = 0;
    for (const char of basePriceStr) {
        if (isNaN(parseInt(char, 10))) return false; // Non-numeric check
        sum += parseInt(char, 10);
    }
    
    const calculatedChecksum = sum % 9;
    
    return providedChecksum === calculatedChecksum;
}

export function getBasePrice(encodedPrice: string): number | null {
    if (!validatePrice(encodedPrice)) return null;
    return parseInt(encodedPrice.slice(0, -1), 10);
}
