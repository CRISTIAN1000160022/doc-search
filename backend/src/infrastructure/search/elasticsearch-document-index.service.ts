import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ElasticsearchService } from "@nestjs/elasticsearch";
import type { DocumentRecord } from "../../domain/documents/document";

export const DOCUMENT_INDEX = "documents";

@Injectable()
export class ElasticsearchDocumentIndex implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchDocumentIndex.name);

  constructor(private readonly elasticsearch: ElasticsearchService) {}

  async onModuleInit(): Promise<void> {
    try {
      const exists = await this.elasticsearch.indices.exists({ index: DOCUMENT_INDEX });
      if (!exists) {
        await this.elasticsearch.indices.create({
          index: DOCUMENT_INDEX,
          mappings: {
            properties: {
              id: { type: "keyword" },
              ownerId: { type: "keyword" },
              title: { type: "text" },
              author: { type: "text" },
              category: { type: "text" },
              tags: { type: "text" },
              version: { type: "keyword" },
              content: { type: "text" },
              createdAt: { type: "date" },
            },
          },
        });
      }
    } catch (error) {
      const cause = error as { meta?: { statusCode?: number; body?: { error?: { type?: string } } } };
      if (cause.meta?.statusCode === 400 && cause.meta.body?.error?.type === "resource_already_exists_exception") return;
      this.logger.error("No se pudo asegurar el índice de documentos", error);
      throw error;
    }
  }

  async index(record: DocumentRecord, content: string): Promise<void> {
    await this.elasticsearch.index({
      index: DOCUMENT_INDEX,
      id: record.id,
      document: {
        id: record.id,
        ownerId: record.ownerId,
        title: record.title,
        author: record.author,
        category: record.category,
        tags: record.tags,
        version: record.version,
        content,
        createdAt: record.createdAt.toISOString(),
      },
      refresh: "wait_for",
    });
  }

  async delete(id: string): Promise<void> {
    await this.elasticsearch.delete({ index: DOCUMENT_INDEX, id, refresh: "wait_for" });
  }
}