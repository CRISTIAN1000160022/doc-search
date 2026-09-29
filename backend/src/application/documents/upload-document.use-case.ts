import { Inject, Injectable, PayloadTooLargeException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { DocumentMetadata } from "@doc-search/shared";
import { DOCUMENT_REPOSITORY, type DocumentRepositoryPort } from "../ports/document-repository.port";
import type { DocumentRecord } from "../../domain/documents/document";
import { validateUpload } from "./file-validation";
import { LocalDocumentStorage } from "../../infrastructure/storage/local-document.storage";

@Injectable()
export class UploadDocumentUseCase {
  constructor(
    @Inject(DOCUMENT_REPOSITORY) private readonly repository: DocumentRepositoryPort,
    private readonly storage: LocalDocumentStorage,
  ) {}

  async execute(ownerId: string, metadata: DocumentMetadata, file: Express.Multer.File): Promise<{ id: string; status: "PROCESSING" }> {
    const maxBytes = Number(process.env.MAX_UPLOAD_BYTES ?? 10 * 1024 * 1024);
    if (file.size > maxBytes) {
      throw new PayloadTooLargeException(`El tamaño máximo permitido es ${maxBytes} bytes`);
    }

    const validated = validateUpload(file.buffer, file.originalname);
    const stored = await this.storage.save(file.buffer, validated.extension);
    const record: DocumentRecord = {
      id: randomUUID(),
      ownerId,
      ...metadata,
      status: "PROCESSING",
      storagePath: stored.path,
      originalName: file.originalname.replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 255),
      mediaType: validated.mediaType,
      extractedText: null,
      error: null,
      createdAt: new Date(),
    };

    try {
      await this.repository.createProcessingWithOutbox(record);
    } catch (error) {
      await this.storage.remove(stored.path);
      throw error;
    }

    return { id: record.id, status: "PROCESSING" };
  }
}