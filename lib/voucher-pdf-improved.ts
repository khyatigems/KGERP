import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { VoucherPDFData, VOUCHER_TYPES, PAYMENT_MODES, isValidVoucherType, isValidPaymentMode, validateVoucherPDFData } from "@/types/pdf-generation";

// Canvas pool for memory management with thread safety
const canvasPool: HTMLCanvasElement[] = [];
let isCleaningUp = false;

// Cleanup function to prevent memory leaks
const cleanupCanvasPool = (): void => {
  if (isCleaningUp) return; // Prevent re-entrant cleanup
  isCleaningUp = true;
  
  try {
    // Remove event listeners first
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', cleanupCanvasPool);
      window.removeEventListener('unload', cleanupCanvasPool);
    }
    
    // Clean up all canvases
    canvasPool.forEach(canvas => {
      try {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Clear any image data
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        // Force garbage collection by removing from DOM
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
        // Reset dimensions to free memory
        canvas.width = 1;
        canvas.height = 1;
        // Remove any event listeners
        canvas.removeAttribute('onload');
        canvas.removeAttribute('onerror');
      } catch (error) {
        console.warn('Error during canvas cleanup:', error);
      }
    });
    
    // Clear the pool array
    canvasPool.length = 0;
  } finally {
    isCleaningUp = false;
  }
};

// Setup cleanup on page unload with proper error handling
if (typeof window !== 'undefined') {
  const setupCleanup = () => {
    try {
      window.addEventListener('beforeunload', cleanupCanvasPool, { once: true });
      window.addEventListener('unload', cleanupCanvasPool, { once: true });
    } catch (error) {
      console.warn('Failed to setup cleanup listeners:', error);
    }
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupCleanup);
  } else {
    setupCleanup();
  }
}

const getCanvas = (): HTMLCanvasElement => {
  // Try to reuse a canvas from the pool with thread safety
  if (isCleaningUp) {
    // If cleanup is in progress, create a temporary canvas
    return document.createElement("canvas");
  }
  
  const canvas = canvasPool.pop();
  if (canvas) {
    // Reset canvas state before reuse
    try {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch (error) {
      console.warn('Error resetting canvas context:', error);
    }
    return canvas;
  }
  
  // Create new canvas if pool is empty
  return document.createElement("canvas");
};

const releaseCanvas = (canvas: HTMLCanvasElement): void => {
  if (isCleaningUp || canvasPool.length >= 5) {
    // If cleanup is in progress or pool is full, remove the canvas
    try {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      canvas.width = 1;
      canvas.height = 1;
      canvas.remove();
    } catch (error) {
      console.warn('Error during canvas removal:', error);
    }
    return;
  }
  
  // Clean up canvas context before returning to pool
  try {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Reset dimensions to minimal size to free memory
    canvas.width = 1;
    canvas.height = 1;
    
    // Add back to pool
    canvasPool.push(canvas);
  } catch (error) {
    console.warn('Error during canvas release:', error);
    // If cleanup fails, remove the canvas to prevent leaks
    try {
      canvas.remove();
    } catch (removeError) {
      console.warn('Error removing canvas:', removeError);
    }
  }
};

// URL validation helper for security
const isValidImageUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const parsedUrl = new URL(url, window.location.origin);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }
    
    // Prevent data URLs and blob URLs for security
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return false;
    }
    
    // Basic domain validation - allow same origin and common image domains
    const allowedDomains = [
      window.location.hostname,
      'localhost',
      '127.0.0.1',
      '0.0.0.0'
    ];
    
    // Allow same origin or explicitly trusted domains
    const hostname = parsedUrl.hostname.toLowerCase();
    return allowedDomains.includes(hostname) || 
           hostname.endsWith('.localhost') ||
           hostname.endsWith('.127.0.0.1') ||
           hostname.endsWith('.0.0.0.0');
  } catch {
    return false;
  }
};

const loadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Enhanced URL validation for security
    if (!isValidImageUrl(url)) {
      reject(new Error(`Invalid or insecure image URL: ${url}`));
      return;
    }

    const img = new Image();
    // Set crossOrigin only for external domains to avoid CORS issues
    try {
      const imageUrl = new URL(url, window.location.origin);
      if (imageUrl.hostname !== window.location.hostname) {
        img.crossOrigin = "Anonymous";
      }
    } catch {
      // If URL parsing fails, don't set crossOrigin
    }
    
    const timeoutId = setTimeout(() => {
      reject(new Error(`Image loading timeout for URL: ${url}`));
    }, 10000); // 10 second timeout
    
    img.onload = () => {
      clearTimeout(timeoutId);
      
      try {
        // Validate image dimensions and content
        if (img.width <= 0 || img.height <= 0) {
          reject(new Error(`Invalid image dimensions: ${img.width}x${img.height} for URL: ${url}`));
          return;
        }
        
        // Check if image is too large (prevent memory issues)
        const maxDimension = 2000; // 2000px max dimension
        if (img.width > maxDimension || img.height > maxDimension) {
          console.warn(`Large image detected (${img.width}x${img.height}), this may affect performance`);
        }

        const canvas = getCanvas();
        
        try {
          // Calculate aspect ratio to maintain proper proportions
          const aspectRatio = img.width / img.height;
          const targetWidth = Math.min(30, img.width); // Don't upscale
          const targetHeight = targetWidth / aspectRatio;
          
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            releaseCanvas(canvas);
            reject(new Error("Failed to get canvas context for image processing"));
            return;
          }
          
          // Enable image smoothing for better quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          
          // Validate canvas content was created successfully
          try {
            const imageData = ctx.getImageData(0, 0, 1, 1);
            if (!imageData) {
              throw new Error('Failed to create image data');
            }
          } catch (canvasError) {
            releaseCanvas(canvas);
            reject(new Error(`Canvas security error: ${canvasError instanceof Error ? canvasError.message : 'Unknown error'}`));
            return;
          }
          
          const dataUrl = canvas.toDataURL("image/png", 0.8); // Use 80% quality
          
          // Clean up and release canvas back to pool
          releaseCanvas(canvas);
          
          resolve(dataUrl);
        } catch (error) {
          releaseCanvas(canvas);
          reject(new Error(`Failed to process image from URL ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      } catch (error) {
        reject(new Error(`Failed to process image from URL ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    img.onerror = (event) => {
      clearTimeout(timeoutId);
      const errorMessage = event instanceof Error ? event.message : 'Unknown loading error';
      reject(new Error(`Failed to load image at ${url}: ${errorMessage}`));
    };
    
    img.onabort = () => {
      clearTimeout(timeoutId);
      reject(new Error(`Image loading aborted for URL: ${url}`));
    };
    
    try {
      img.src = url;
    } catch (error) {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to set image source for URL ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
};

// Safe error message utility to prevent information disclosure
export const getSafeErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    // Only expose safe error messages, filter out potentially sensitive information
    const message = error.message;
    
    // Check for known safe error patterns
    if (message.includes('Validation failed')) return message;
    if (message.includes('Invalid image URL')) return message;
    if (message.includes('Failed to load image')) return message;
    if (message.includes('Image loading timeout')) return message;
    if (message.includes('Invalid image dimensions')) return message;
    if (message.includes('Canvas security error')) return message;
    if (message.includes('Failed to get canvas context')) return message;
    if (message.includes('Invalid voucher data')) return message;
    if (message.includes('Invalid register data')) return message;
    if (message.includes('PDF generation failed')) return message;
    if (message.includes('Register generation failed')) return message;
    
    // For unknown errors, return a generic message
    return 'An unexpected error occurred. Please try again.';
  }
  
  return 'An unexpected error occurred. Please try again.';
};

// Helper to ensure consistent date handling
const ensureDate = (date: Date | string | undefined | null): Date => {
  if (date instanceof Date) {
    return date;
  }
  if (typeof date === 'string') {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new Error(`Invalid date string: ${date}`);
    }
    return parsedDate;
  }
  throw new Error(`Invalid date type: ${typeof date}`);
};

// Helper to format number safely for PDF (consistent with register PDF)
const formatAmount = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export async function generateVoucherPDF(data: VoucherPDFData) {
  // Comprehensive input validation using validation function
  const validation = validateVoucherPDFData(data);
  if (!validation.isValid) {
    const errorMessages = validation.errors.map(err => `${err.field}: ${err.message}`).join('; ');
    throw new Error(`Validation failed: ${errorMessages}`);
  }

  // Type-specific validations
  if (!isValidVoucherType(data.type)) {
    throw new Error(`Invalid voucher type: ${data.type}. Must be one of: ${Object.values(VOUCHER_TYPES).join(', ')}`);
  }

  if (!isValidPaymentMode(data.paymentMode)) {
    throw new Error(`Invalid payment mode: ${data.paymentMode}. Must be one of: ${Object.values(PAYMENT_MODES).join(', ')}`);
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;

  // --- 1. OUTER BORDER ---
  doc.setLineWidth(0.5);
  doc.setDrawColor(0);
  doc.rect(margin, margin, contentWidth, pageHeight - (margin * 2));

  // --- 2. HEADER SECTION ---
  
  // Logo with proper aspect ratio
  let logoHeight = 0;
  if (data.logoUrl) {
    try {
      const logoData = await loadImage(data.logoUrl);
      // Calculate proper dimensions to maintain aspect ratio
      const logoWidth = 30;
      doc.addImage(logoData, "PNG", margin + 5, y + 5, logoWidth, 30);
      logoHeight = 35; // 30mm height + 5mm padding
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`Logo load failed for URL "${data.logoUrl}": ${errorMessage}. Proceeding without logo.`);
      // Continue without logo - don't fail the entire PDF generation
    }
  }

  // Company Details (Centered alignment)
  const headerTextX = margin + (logoHeight > 0 ? 40 : 5);
  const maxNameWidth = pageWidth - margin - 70 - headerTextX;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  
  // Company Name - Properly centered
  const splitName = doc.splitTextToSize(data.companyName.toUpperCase(), maxNameWidth);
  const nameWidth = doc.getTextWidth(splitName[0]);
  doc.text(splitName, pageWidth / 2, y + 10, { align: "center" });
  
  // Dynamic offset for address based on name height
  const nameHeight = splitName.length * 7;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60);
  
  const addressLines = [
    data.companyAddress,
    data.companyPhone ? `Phone: ${data.companyPhone}` : "",
    data.companyEmail ? `Email: ${data.companyEmail}` : ""
  ].filter(Boolean);
  
  if (addressLines.length > 0) {
    doc.text(addressLines.join("\n"), pageWidth / 2, y + 10 + nameHeight, { align: "center" });
  }
  
  // Voucher Title Box (Top Right) - Improved positioning
  const title = data.type === "EXPENSE" ? "PAYMENT VOUCHER" : 
                data.type === "RECEIPT" ? "RECEIPT VOUCHER" : 
                data.type === "REVERSAL" ? "REVERSAL VOUCHER" : "JOURNAL VOUCHER";

  doc.setFillColor(240, 240, 240);
  doc.rect(pageWidth - margin - 65, y + 5, 60, 12, "F");
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, pageWidth - margin - 35, y + 11.5, { align: "center" });

  y += Math.max(logoHeight, 35) + 10;
  
  // Draw a horizontal line separating header
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  
  y += 10;

  // --- 3. VOUCHER INFO GRID ---
  doc.setFontSize(10);
  
  const col1 = margin + 5;
  const col2 = pageWidth / 2 + 5;
  
  // Left Column: Voucher No, Date
  doc.setFont("helvetica", "bold");
  doc.text("Voucher No:", col1, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.voucherNumber, col1 + 30, y);
  
  doc.setFont("helvetica", "bold");
  doc.text("Date:", col2, y);
  doc.setFont("helvetica", "normal");
  doc.text(format(ensureDate(data.date), "dd-MMM-yyyy"), col2 + 20, y);
  
  y += 8;
  
  // Row 2: Type, Mode
  doc.setFont("helvetica", "bold");
  doc.text("Type:", col1, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.type, col1 + 30, y);
  
  doc.setFont("helvetica", "bold");
  doc.text("Mode:", col2, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.paymentMode, col2 + 20, y);

  y += 8;

  // Row 3: Customer/Invoice info (if available)
  if (data.customerName || data.invoiceNumber) {
    doc.setFont("helvetica", "bold");
    doc.text("Customer:", col1, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.customerName || "-", col1 + 30, y);
    
    doc.setFont("helvetica", "bold");
    doc.text("Invoice:", col2, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.invoiceNumber || "-", col2 + 20, y);
    
    y += 8;
  }

  y += 5;

  // --- 4. TABLE SECTION ---
  
  // Enhanced narration with invoice reference
  const narrationParts = [];
  if (data.category) narrationParts.push(`Account: ${data.category}`);
  if (data.vendorName) narrationParts.push(`Party: ${data.vendorName}`);
  if (data.invoiceNumber) narrationParts.push(`Invoice: ${data.invoiceNumber}`);
  if (data.customerName) narrationParts.push(`Customer: ${data.customerName}`);
  if (data.narration) narrationParts.push(`Details: ${data.narration}`);
  
  const enhancedNarration = narrationParts.join("\n");

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Particulars", "Debit (₹)", "Credit (₹)"]],
    body: [
      [
        enhancedNarration,
        data.type === "EXPENSE" || data.type === "PAYMENT" ? formatAmount(data.amount) : "",
        data.type === "RECEIPT" ? formatAmount(data.amount) : ""
      ]
    ],
    theme: "grid",
    styles: {
      fontSize: 10,
      cellPadding: 6,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      lineWidth: 0.1,
      lineColor: [0, 0, 0]
    },
    columnStyles: {
      0: { 
        cellWidth: "auto",
        valign: "top"
      },
      1: { 
        cellWidth: 35, 
        halign: "right", 
        fontStyle: "bold",
        valign: "top",
        fontSize: 12
      },
      2: { 
        cellWidth: 35, 
        halign: "right", 
        fontStyle: "bold",
        valign: "top",
        fontSize: 12
      }
    }
  });

  // @ts-expect-error - jspdf-autotable types
  y = doc.lastAutoTable.finalY;
  
  y += 5;

  // --- 5. AMOUNT IN WORDS ---
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Amount (in words):", margin + 5, y + 5);
  doc.setFont("helvetica", "normal");
  const words = `${convertNumberToWords(data.amount)}`;
  const splitWords = doc.splitTextToSize(words, contentWidth - 45);
  doc.text(splitWords, margin + 40, y + 5);

  y += Math.max(splitWords.length * 5, 10) + 10;

  // --- 6. AUTHORIZATION SECTION ---
  const footerY = pageHeight - margin - 40;
  
  // Draw line above signatures
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  const sigBoxWidth = (contentWidth - 20) / 3;
  const sigY = footerY + 20;

  // Prepared By
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Prepared By", margin + 5, footerY);
  doc.setFont("helvetica", "bold");
  doc.text(data.createdBy, margin + 5, footerY + 5);
  doc.line(margin + 5, sigY, margin + 5 + sigBoxWidth, sigY);

  // Verified By
  doc.setFont("helvetica", "normal");
  doc.text("Verified By", margin + 10 + sigBoxWidth, footerY);
  doc.line(margin + 10 + sigBoxWidth, sigY, margin + 10 + (sigBoxWidth * 2), sigY);

  // Receiver
  doc.setFont("helvetica", "normal");
  doc.text("Receiver's Signature", margin + 15 + (sigBoxWidth * 2), footerY);
  doc.line(margin + 15 + (sigBoxWidth * 2), sigY, pageWidth - margin - 5, sigY);

  // --- 7. SYSTEM FOOTER ---
  const systemFooterY = pageHeight - margin - 5;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Generated by KhyatiGems™ ERP", pageWidth / 2, systemFooterY, { align: "center" });

  // --- WATERMARK ---
  if (data.type === "REVERSAL" || data.type === "CANCELLED") {
      doc.setTextColor(255, 200, 200);
      doc.setFontSize(50);
      doc.setFont("helvetica", "bold");
      doc.saveGraphicsState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      doc.setGState(new (doc as any).GState({ opacity: 0.3 }));
      doc.text("CANCELLED", pageWidth / 2, pageHeight / 2, { align: "center", angle: 45 });
      doc.restoreGraphicsState();
  }

  return doc.output("blob");
}

function convertNumberToWords(amount: number): string {
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convertToWords = (n: number): string => {
    if (n === 0) return "";
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + units[n % 10] : "");
    if (n < 1000) return units[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + convertToWords(n % 100) : "");
    if (n < 100000) return convertToWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convertToWords(n % 1000) : "");
    if (n < 10000000) return convertToWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + convertToWords(n % 100000) : "");
    return convertToWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + convertToWords(n % 10000000) : "");
  };

  const [rupees, paise] = amount.toFixed(2).split(".");
  
  let words = "";
  const rupeesInt = parseInt(rupees);
  
  if (rupeesInt === 0) {
    words = "Zero Rupees";
  } else {
    words = convertToWords(rupeesInt) + " Rupees";
  }

  const paiseInt = parseInt(paise);
  if (paiseInt > 0) {
    words += " and " + convertToWords(paiseInt) + " Paise";
  }

  return words + " Only";
}
