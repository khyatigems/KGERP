import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { uploadToCloudinary } from "@/lib/cloudinary";

export type DocumentType = "INVOICE" | "CERTIFICATE" | "PACKING_SLIP" | "OTHER";

export interface CreateDocumentInput {
  type: DocumentType;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  storageProvider?: string;
  storageRef?: string | null;
  customerId?: string | null;
  orderId?: string | null;
  saleId?: string | null;
  invoiceId?: string | null;
  certificateNumber?: string | null;
  status?: string;
}

export interface StoredDocument {
  id: string;
  type: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number | null;
  storageProvider: string;
  storageRef: string | null;
  certificateNumber: string | null;
  status: string;
  createdAt: Date;
}

/**
 * Canonical document store. One source of truth for document metadata and
 * secure storage references (Cloudinary/ImageKit/URL). Binaries are not stored
 * in the DB.
 */
export async function createDocument(input: CreateDocumentInput): Promise<StoredDocument> {
  return prisma.document.create({
    data: {
      id: crypto.randomUUID(),
      type: input.type,
      fileName: input.fileName,
      mimeType: input.mimeType || "application/pdf",
      sizeBytes: input.sizeBytes ?? null,
      storageProvider: input.storageProvider || "CLOUDINARY",
      storageRef: input.storageRef ?? null,
      customerId: input.customerId ?? null,
      orderId: input.orderId ?? null,
      saleId: input.saleId ?? null,
      invoiceId: input.invoiceId ?? null,
      certificateNumber: input.certificateNumber ?? null,
      status: input.status || "READY",
    },
  });
}

export async function storeDocumentBuffer(input: {
  type: DocumentType;
  buffer: Buffer;
  fileName: string;
  mimeType?: string;
  customerId?: string | null;
  orderId?: string | null;
  saleId?: string | null;
  invoiceId?: string | null;
  certificateNumber?: string | null;
}): Promise<StoredDocument> {
  let storageRef: string | null = null;
  try {
    storageRef = await uploadToCloudinary(input.buffer, input.fileName);
  } catch (error) {
    console.error("[document-service] Cloudinary upload failed:", error);
  }

  return createDocument({
    type: input.type,
    fileName: input.fileName,
    mimeType: input.mimeType || "application/pdf",
    sizeBytes: input.buffer.length,
    storageProvider: storageRef ? "CLOUDINARY" : "BUFFER",
    storageRef,
    customerId: input.customerId,
    orderId: input.orderId,
    saleId: input.saleId,
    invoiceId: input.invoiceId,
    certificateNumber: input.certificateNumber,
  });
}

export async function listDocumentsForOrder(orderId: string): Promise<StoredDocument[]> {
  return prisma.document.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });
}

export async function listDocumentsForCustomer(customerId: string): Promise<StoredDocument[]> {
  return prisma.document.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });
}

export async function listDocumentsForInvoice(invoiceId: string): Promise<StoredDocument[]> {
  return prisma.document.findMany({
    where: { invoiceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDocumentById(id: string): Promise<StoredDocument | null> {
  return prisma.document.findUnique({ where: { id } });
}

export async function findCertificateDocuments(certificateNumber: string): Promise<StoredDocument[]> {
  return prisma.document.findMany({
    where: { certificateNumber, type: "CERTIFICATE" },
    orderBy: { createdAt: "desc" },
  });
}
