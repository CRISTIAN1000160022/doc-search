import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { readFile } from "node:fs/promises";
import pdfParse from "pdf-parse";
import type { DocumentStatusEvent } from "@doc-search/shared";
import { TypeOrmDocumentRepository } from "../persistence/typeorm-document.repository";
import { ElasticsearchDocumentIndex } from "../search/elasticsearch-document-index.service";
import { RedisStatusEvents } from "../events/redis-status-events.service";

interface IndexJob {
  documentId: string;
  ownerId: string;
}

@Injectable()
@Processor("documents", { concurrency: 4 })
export class DocumentProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentProcessor.name);

  constructor(
    private readonly documents: TypeOrmDocumentRepository,
    private readonly searchIndex: ElasticsearchDocumentIndex,
    private readonly statusEvents: RedisStatusEvents,
  ) {
    super();
  }

  async process(job: Job<IndexJob>): Promise<void> {
    const record = await this.documents.findById(job.data.documentId);
    if (!record || record.ownerId !== job.data.ownerId) {
      throw new Error("El documento asociado al trabajo no existe o no coincide con el propietario");
    }

    const buffer = await readFile(record.storagePath);
    const content = record.mediaType === "application/pdf"
      ? (await pdfParse(buffer)).text
      : new TextDecoder("utf-8", { fatal: true }).decode(buffer);

    await this.searchIndex.index(record, content);
    await this.documents.updateProcessingResult(record.id, "INDEXED", content, null);
    await this.publish(record.id, record.ownerId, "INDEXED");
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job<IndexJob> | undefined, error: Error): Promise<void> {
    if (!job || job.attemptsMade < Number(job.opts.attempts ?? 1)) return;
    const record = await this.documents.findById(job.data.documentId);
    if (!record) return;
    const message = error.message.slice(0, 1000);
    await this.documents.updateProcessingResult(record.id, "ERROR", null, message);
    await this.searchIndex.delete(record.id).catch(() => undefined);
    await this.publish(record.id, record.ownerId, "ERROR", message);
    this.logger.error(`Falló el procesamiento de ${record.id}: ${message}`);
  }

  private async publish(documentId: string, ownerId: string, status: "INDEXED" | "ERROR", error?: string): Promise<void> {
    const event: DocumentStatusEvent = {
      documentId,
      ownerId,
      status,
      occurredAt: new Date().toISOString(),
      ...(error === undefined ? {} : { error }),
    };
    await this.statusEvents.publish(event);
  }
}