import type { DocumentRecord } from "../../domain/documents/document";

export const DOCUMENT_REPOSITORY = Symbol("DOCUMENT_REPOSITORY");

export interface DocumentRepositoryPort {
  createProcessing(record: DocumentRecord): Promise<void>;
  findOwned(id: string, ownerId: string): Promise<DocumentRecord | null>;
  updateProcessingResult(id: string, status: "INDEXED" | "ERROR", text: string | null, error: string | null): Promise<void>;
}