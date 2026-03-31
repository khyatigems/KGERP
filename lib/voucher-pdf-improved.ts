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

const loadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Skip validation for data URLs and blob URLs (common for logos)
    if (!url || typeof url !== 'string') {
      reject(new Error(`Invalid image URL: ${url}`));
      return;
    }

    // Allow data URLs, blob URLs, and external URLs
    if (!url.startsWith('data:') && !url.startsWith('blob:') && !url.startsWith('http') && !url.startsWith('https')) {
      reject(new Error(`Invalid image URL protocol: ${url}`));
      return;
    }

    const img = new Image();
    
    // Set crossOrigin for external images
    if (url.startsWith('http') || url.startsWith('https')) {
      img.crossOrigin = "Anonymous";
    }
    
    const timeoutId = setTimeout(() => {
      reject(new Error(`Image loading timeout for URL: ${url}`));
    }, 15000); // Increased timeout to 15 seconds
    
    img.onload = () => {
      clearTimeout(timeoutId);
      
      try {
        // Validate image dimensions
        if (img.width <= 0 || img.height <= 0) {
          reject(new Error(`Invalid image dimensions: ${img.width}x${img.height} for URL: ${url}`));
          return;
        }
        
        // Accept larger images but resize appropriately
        const maxDimension = 500; // Increased max dimension
        if (img.width > maxDimension || img.height > maxDimension) {
          console.log(`Processing large image (${img.width}x${img.height}) for PDF`);
          
          // For very large images, reduce target size further to prevent memory issues
          if (img.width > 2000 || img.height > 2000) {
            console.log(`Very large image detected, using smaller target size`);
          }
        }

        const canvas = getCanvas();
        
        try {
          // Calculate aspect ratio and target size
          const aspectRatio = img.width / img.height;
          let targetWidth = Math.min(40, img.width); // Increased logo size
          
          // For very large images, use smaller target size to prevent memory issues
          if (img.width > 2000 || img.height > 2000) {
            targetWidth = Math.min(20, img.width);
          }
          
          const targetHeight = targetWidth / aspectRatio;
          
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            releaseCanvas(canvas);
            reject(new Error("Failed to get canvas context for image processing"));
            return;
          }
          
          // Enable high-quality image rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Draw image with proper dimensions
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          
          // Get data URL with appropriate quality based on image size
          const quality = (img.width > 2000 || img.height > 2000) ? 0.7 : 0.9;
          const dataUrl = canvas.toDataURL("image/png", quality);
          
          // Clean up canvas
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
      reject(new Error(`Failed to load image at ${url}: Network or CORS error`));
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

// Helper to convert numbers to words (simplified version)
const convertNumberToWords = (num: number): string => {
  if (num === 0) return "Zero";
  
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  
  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return "";
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const ten = Math.floor(n / 10);
      const unit = n % 10;
      return tens[ten] + (unit ? " " + units[unit] : "");
    }
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    return units[hundred] + " Hundred" + (remainder ? " " + convertLessThanThousand(remainder) : "");
  };
  
  if (num < 1000) return convertLessThanThousand(num);
  
  const thousand = Math.floor(num / 1000);
  const remainder = num % 1000;
  
  if (num < 100000) {
    return convertLessThanThousand(thousand) + " Thousand" + (remainder ? " " + convertLessThanThousand(remainder) : "");
  }
  
  // For larger numbers, return a simplified version
  return num.toLocaleString('en-IN');
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

  // Company Details (Centered alignment) - Improved positioning
  const maxNameWidth = pageWidth - margin - 80;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18); // Increased font size for better visibility
  
  // Company Name - Properly centered with better spacing
  const splitName = doc.splitTextToSize(data.companyName.toUpperCase(), maxNameWidth);
  const nameY = y + 15; // Better vertical positioning
  
  // Draw company name with proper spacing
  splitName.forEach((line: string, index: number) => {
    doc.text(line, pageWidth / 2, nameY + (index * 8), { align: "center" });
  });
  
  // Dynamic offset for address based on name height
  const nameHeight = splitName.length * 8;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10); // Increased font size for better readability
  doc.setTextColor(60);
  
  const addressLines = [
    data.companyAddress,
    data.companyPhone ? `Phone: ${data.companyPhone}` : "",
    data.companyEmail ? `Email: ${data.companyEmail}` : ""
  ].filter(Boolean);
  
  if (addressLines.length > 0) {
    const addressY = nameY + nameHeight + 5;
    addressLines.forEach((line: string | undefined, index: number) => {
      if (line) {
        doc.text(line, pageWidth / 2, addressY + (index * 6), { align: "center" });
      }
    });
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

  y += Math.max(logoHeight, 45) + 10; // Adjusted spacing for better layout
  
  // Draw a horizontal line separating header
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  
  y += 12; // Increased spacing for better readability

  // --- 3. VOUCHER INFO GRID ---
  doc.setFontSize(11); // Increased font size for better readability
  
  const col1 = margin + 8; // Increased spacing
  const col2 = pageWidth / 2 + 8;
  
  // Left Column: Voucher No, Date
  doc.setFont("helvetica", "bold");
  doc.text("Voucher No:", col1, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.voucherNumber, col1 + 35, y);
  
  doc.setFont("helvetica", "bold");
  doc.text("Date:", col2, y);
  doc.setFont("helvetica", "normal");
  doc.text(format(ensureDate(data.date), "dd-MMM-yyyy"), col2 + 25, y);
  
  y += 10; // Increased row spacing
  
  // Row 2: Type, Mode
  doc.setFont("helvetica", "bold");
  doc.text("Type:", col1, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.type, col1 + 35, y);
  
  doc.setFont("helvetica", "bold");
  doc.text("Mode:", col2, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.paymentMode, col2 + 25, y);

  y += 10; // Increased row spacing

  // Row 3: Customer/Invoice info (if available)
  if (data.customerName || data.invoiceNumber) {
    doc.setFont("helvetica", "bold");
    doc.text("Customer:", col1, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.customerName || "-", col1 + 35, y);
    
    doc.setFont("helvetica", "bold");
    doc.text("Invoice:", col2, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.invoiceNumber || "-", col2 + 25, y);
    
    y += 10;
  }

  y += 8; // Increased spacing before table

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
    headStyles: {
      fillColor: [40, 40, 40],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
      fontSize: 11,
      cellPadding: 4
    },
    columnStyles: {
      0: { cellWidth: "auto", halign: "left", fontSize: 10, cellPadding: 4 },
      1: { cellWidth: 40, halign: "right", fontStyle: "bold", fontSize: 11, cellPadding: 4 },
      2: { cellWidth: 40, halign: "right", fontStyle: "bold", fontSize: 11, cellPadding: 4 }
    },
    styles: {
      fontSize: 10,
      cellPadding: 4, // Increased padding for better spacing
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
      overflow: 'linebreak' // Ensure text wraps properly
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250]
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
  const words = `${convertNumberToWords(data.amount)} Rupees Only`;
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

  // Checked By (middle)
  doc.setFont("helvetica", "normal");
  doc.text("Checked By", margin + 5 + sigBoxWidth + 10, footerY);
  doc.line(margin + 5 + sigBoxWidth + 10, sigY, margin + 5 + (sigBoxWidth * 2) + 10, sigY);

  // Approved By (right)
  doc.setFont("helvetica", "normal");
  doc.text("Approved By", pageWidth - margin - sigBoxWidth - 5, footerY);
  doc.line(pageWidth - margin - sigBoxWidth - 5, sigY, pageWidth - margin - 5, sigY);

  // --- 7. FOOTER ---
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("This is a computer-generated document and does not require a signature.", pageWidth / 2, pageHeight - 10, { align: "center" });

  return doc.output('blob');
}
