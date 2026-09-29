import type { DocumentMetadata, DocumentStatus } from "@doc-search/shared";

export interface DocumentRecord extends DocumentMetadata {
  id: string;
  ownerId: string;
  status: DocumentStatus;
  storagePath: string;
  originalName: string;
  extractedText: string | null;
  error: string | null;
  createdAt: Date;
  mediaType: "application/pdf" | "text/plain" | "text/markdown";
}