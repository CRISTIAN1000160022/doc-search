export const DOCUMENT_STATUSES = ["PROCESSING", "INDEXED", "ERROR"] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export interface DocumentMetadata {
  title: string;
  author: string;
  category: string;
  tags: string[];
  version: string;
}

export interface DocumentStatusEvent {
  documentId: string;
  ownerId: string;
  status: Exclude<DocumentStatus, "PROCESSING">;
  error?: string;
  occurredAt: string;
}

export interface DocumentSummary extends DocumentMetadata {
  id: string;
  status: DocumentStatus;
  createdAt: string;
}

export interface SearchHit extends DocumentSummary {
  highlights: string[];
}

export interface PaginatedSearchResult {
  items: SearchHit[];
  total: number;
  offset: number;
  limit: number;
}