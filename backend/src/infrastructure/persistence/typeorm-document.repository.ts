import { Injectable } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import type { DocumentRecord } from "../../domain/documents/document";
import type { DocumentRepositoryPort } from "../../application/ports/document-repository.port";
import { DocumentEntity } from "./document.entity";
import { OutboxEntity } from "./outbox.entity";

@Injectable()
export class TypeOrmDocumentRepository implements DocumentRepositoryPort {
  private readonly documents: Repository<DocumentEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.documents = dataSource.getRepository(DocumentEntity);
  }

  async createProcessingWithOutbox(record: DocumentRecord): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.insert(DocumentEntity, {
        ...record,
        extractedText: null,
        error: null,
        status: "PROCESSING",
      });
      await manager.insert(OutboxEntity, {
        aggregateId: record.id,
        eventType: "DOCUMENT_RECEIVED",
        payload: { documentId: record.id, ownerId: record.ownerId },
        processedAt: null,
        attempts: 0,
      });
    });
  }

  async findOwned(id: string, ownerId: string): Promise<DocumentRecord | null> {
    const entity = await this.documents.findOne({ where: { id, ownerId } });
    return entity ? this.toRecord(entity) : null;
  }

  async findById(id: string): Promise<DocumentRecord | null> {
    const entity = await this.documents.findOne({ where: { id } });
    return entity ? this.toRecord(entity) : null;
  }

  async updateProcessingResult(
    id: string,
    status: "INDEXED" | "ERROR",
    text: string | null,
    error: string | null,
  ): Promise<void> {
    await this.documents.update({ id }, { status, extractedText: text, error });
  }

  private toRecord(entity: DocumentEntity): DocumentRecord {
    return {
      id: entity.id,
      ownerId: entity.ownerId,
      title: entity.title,
      author: entity.author,
      category: entity.category,
      tags: entity.tags,
      version: entity.version,
      storagePath: entity.storagePath,
      originalName: entity.originalName,
      mediaType: entity.mediaType as DocumentRecord["mediaType"],
      status: entity.status,
      extractedText: entity.extractedText,
      error: entity.error,
      createdAt: entity.createdAt,
    };
  }
}