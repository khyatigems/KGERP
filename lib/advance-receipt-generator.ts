import jsPDF from "jspdf";
import { formatDate } from "@/lib/utils";

export interface AdvanceReceiptData {
  advanceNumber: string;
  date: Date;
  amount: number;
  remainingAmount: number;
  paymentMode: string;
  paymentRef?: string | null;
  notes?: string | null;
  customer: {
    name: string;
    customerCode?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  company: {
    name: string;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    gstin?: string | null;
    website?: string | null;
    logoUrl?: string | null;
  };
  terms?: string | null;
  createdBy?: string | null;
}

const loadImageMeta = (url: string): Promise<{ dataUrl: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      try {
        const dataUrl = canvas.toDataURL("image/png");
        resolve({ dataUrl, width: img.width, height: img.height });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error(`Failed to load image at ${url}`));
    img.src = url;
  });
};

const formatCurrencyPDF = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null || isNaN(amount)) return "Rs. 0.00";
  // Use simple toFixed to avoid Intl.NumberFormat spacing issues in PDF
  return `Rs. ${Number(amount).toFixed(2)}`;
};

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
  const rupeesInt = parseInt(rupees);
  const paiseInt = parseInt(paise);

  let words = rupeesInt === 0 ? "Zero Rupees" : convertToWords(rupeesInt) + " Rupees";
  if (paiseInt > 0) {
    words += " and " + convertToWords(paiseInt) + " Paise";
  }
  return words + " Only";
}

export async function generateAdvanceReceiptPDF(data: AdvanceReceiptData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 12;
  let y = margin;

  const primaryColor: [number, number, number] = [37, 99, 235];
  const darkColor: [number, number, number] = [31, 41, 55];
  const lightGray: [number, number, number] = [243, 244, 246];
  const borderColor: [number, number, number] = [229, 231, 235];

  let logoDataUrl: string | null = null;
  let logoW = 0;
  let logoH = 0;

  if (data.company.logoUrl) {
    try {
      const res = await loadImageMeta(data.company.logoUrl);
      logoDataUrl = res.dataUrl;
      logoW = res.width;
      logoH = res.height;
    } catch {
      // Ignore
    }
  }

  const drawLine = (x1: number, y1: number, x2: number, y2: number, color: [number, number, number] = borderColor) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.5);
    doc.line(x1, y1, x2, y2);
  };

  const drawRect = (x: number, y: number, w: number, h: number, fillColor: [number, number, number] = [255, 255, 255]) => {
    doc.setFillColor(...fillColor);
    doc.setDrawColor(...borderColor);
    doc.rect(x, y, w, h, "FD");
  };

  const drawCenteredText = (text: string, y: number, fontSize: number = 10, bold: boolean = false, color: [number, number, number] = darkColor) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...color);
    doc.text(text, pageWidth / 2, y, { align: "center" });
  };

  const drawLabelValue = (label: string, value: string, y: number, x: number = margin, labelWidth: number = 38) => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text(label, x, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...darkColor);
    doc.text(value, x + labelWidth, y);
  };

  // Header
  if (logoDataUrl) {
    const maxLogoWidth = 25;
    const maxLogoHeight = 12;
    let renderW = logoW;
    let renderH = logoH;
    if (renderW > maxLogoWidth) {
      renderH = (maxLogoWidth / renderW) * renderH;
      renderW = maxLogoWidth;
    }
    if (renderH > maxLogoHeight) {
      renderW = (maxLogoHeight / renderH) * renderW;
      renderH = maxLogoHeight;
    }
    try {
      doc.addImage(logoDataUrl, "PNG", margin, y, renderW, renderH);
    } catch {}
  }

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text(data.company.name || "Khyati Gems", pageWidth - margin, y + 4, { align: "right" });

  y += 7;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  
  const companyInfo = [];
  if (data.company.address) companyInfo.push(data.company.address);
  if (data.company.phone) companyInfo.push(`Ph: ${data.company.phone}`);
  if (data.company.email) companyInfo.push(data.company.email);
  if (data.company.gstin) companyInfo.push(`GSTIN: ${data.company.gstin}`);
  
  companyInfo.forEach((info) => {
    doc.text(info, pageWidth - margin, y, { align: "right" });
    y += 3.5;
  });

  y += 1;
  drawLine(margin, y, pageWidth - margin, y, primaryColor);

  // Title
  y += 6;
  drawCenteredText("ADVANCE RECEIPT", y, 14, true, primaryColor);
  
  y += 5;
  const badgeWidth = 40;
  const badgeX = (pageWidth - badgeWidth) / 2;
  doc.setFillColor(...lightGray);
  doc.setDrawColor(...primaryColor);
  doc.rect(badgeX, y - 2.5, badgeWidth, 5, "FD");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("CUSTOMER ADVANCE", pageWidth / 2, y + 0.5, { align: "center" });

  // Main Receipt Box
  y += 8;
  const boxHeight = 48;
  drawRect(margin, y, pageWidth - (margin * 2), boxHeight, [250, 250, 255]);

  let leftY = y + 6;
  drawLabelValue("Receipt No:", data.advanceNumber, leftY);
  leftY += 6;
  drawLabelValue("Date:", formatDate(data.date), leftY);
  leftY += 6;
  drawLabelValue("Payment Mode:", data.paymentMode.replace(/_/g, " "), leftY);
  if (data.paymentRef) {
    leftY += 6;
    drawLabelValue("Reference:", data.paymentRef, leftY);
  }

  const rightX = pageWidth / 2 + 3;
  let rightY = y + 6;
  
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...primaryColor);
  doc.rect(rightX, rightY - 2, 55, 18, "FD");
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("AMOUNT RECEIVED", rightX + 27.5, rightY + 2, { align: "center" });
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(formatCurrencyPDF(data.amount), rightX + 27.5, rightY + 12, { align: "center" });

  rightY += 24;
  drawLabelValue("Available Credit:", formatCurrencyPDF(data.remainingAmount), rightY, rightX, 32);

  // Amount in Words
  y += boxHeight + 3;
  doc.setFillColor(...lightGray);
  doc.setDrawColor(...borderColor);
  doc.rect(margin, y - 2, pageWidth - (margin * 2), 10, "FD");
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("Amount in Words:", margin + 2, y + 1);
  
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  const words = convertNumberToWords(data.amount);
  doc.text(words, margin + 2, y + 6);

  // Customer Details
  y += 14;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("Customer Details", margin, y);
  
  y += 1.5;
  drawLine(margin, y, pageWidth - margin, y, borderColor);
  
  y += 4;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkColor);
  doc.text(data.customer.name, margin, y);
  
  if (data.customer.customerCode) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`(Code: ${data.customer.customerCode})`, margin + doc.getTextWidth(data.customer.name) + 2, y);
  }

  y += 5;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  
  const customerInfo = [];
  if (data.customer.phone) customerInfo.push(`Phone: ${data.customer.phone}`);
  if (data.customer.email) customerInfo.push(`Email: ${data.customer.email}`);
  if (data.customer.address) customerInfo.push(data.customer.address);
  
  customerInfo.forEach((info) => {
    doc.text(info, margin, y);
    y += 3.5;
  });

  // Terms & Conditions
  y += 2;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...primaryColor);
  doc.text("Terms & Conditions", margin, y);
  
  y += 1.5;
  drawLine(margin, y, pageWidth - margin, y, borderColor);
  
  y += 4;
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  
  const termsText = data.terms || "This advance is valid for 6 months from the date of issue. Please present this receipt for any adjustments or refunds. Refunds are subject to company policy.";
  const termsLines = doc.splitTextToSize(termsText, pageWidth - (margin * 2) - 4);
  const limitedTerms = termsLines.slice(0, 2);
  doc.text(limitedTerms, margin, y);
  y += limitedTerms.length * 2.5 + 1;
  
  if (data.notes) {
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    const noteLines = doc.splitTextToSize(`Note: ${data.notes}`, pageWidth - (margin * 2) - 4);
    const limitedNote = noteLines.slice(0, 2);
    doc.text(limitedNote, margin, y);
  }

  // Signature Section - Fixed at bottom
  const sigY = pageHeight - margin - 22;
  
  drawLine(margin, sigY, pageWidth - margin, sigY, borderColor);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...darkColor);
  doc.text("Received by", margin, sigY + 8);
  drawLine(margin, sigY + 12, margin + 45, sigY + 12, darkColor);
  doc.setFontSize(6);
  doc.text("Authorized Signature", margin, sigY + 16);

  doc.setFontSize(8);
  doc.text("Customer Acknowledgment", pageWidth - margin - 45, sigY + 8);
  drawLine(pageWidth - margin - 45, sigY + 12, pageWidth - margin, sigY + 12, darkColor);
  doc.setFontSize(6);
  doc.text("Customer Signature", pageWidth - margin - 45, sigY + 16);

  // Footer
  doc.setFontSize(5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(150, 150, 150);
  doc.text("This is a computer generated receipt and does not require physical signature.", pageWidth / 2, pageHeight - margin - 2, { align: "center" });

  return doc.output("blob");
}
