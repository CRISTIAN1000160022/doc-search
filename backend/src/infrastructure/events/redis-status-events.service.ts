import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import Redis from "ioredis";
import { Subject, filter, type Observable } from "rxjs";
import type { DocumentStatusEvent } from "@doc-search/shared";

const CHANNEL = "documents:status";

@Injectable()
export class RedisStatusEvents implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisStatusEvents.name);
  private readonly publisher = this.createClient();
  private readonly subscriber = this.createClient();
  private readonly events = new Subject<DocumentStatusEvent>();

  async onModuleInit(): Promise<void> {
    this.subscriber.on("message", (_channel, payload) => {
      try {
        const event: unknown = JSON.parse(payload);
        if (this.isStatusEvent(event)) this.events.next(event);
      } catch (error) {
        this.logger.warn(`Evento de estado inválido: ${String(error)}`);
      }
    });
    await this.subscriber.subscribe(CHANNEL);
  }

  async onModuleDestroy(): Promise<void> {
    this.events.complete();
    await Promise.all([this.publisher.quit(), this.subscriber.quit()]);
  }

  watch(documentId: string): Observable<DocumentStatusEvent> {
    return this.events.pipe(filter((event) => event.documentId === documentId));
  }

  async publish(event: DocumentStatusEvent): Promise<void> {
    await this.publisher.publish(CHANNEL, JSON.stringify(event));
  }

  private createClient(): Redis {
    return new Redis({
      host: process.env.REDIS_HOST ?? "redis",
      port: Number(process.env.REDIS_PORT ?? 6379),
      maxRetriesPerRequest: null,
    });
  }

  private isStatusEvent(value: unknown): value is DocumentStatusEvent {
    if (typeof value !== "object" || value === null) return false;
    const event = value as Record<string, unknown>;
    return typeof event.documentId === "string"
      && typeof event.ownerId === "string"
      && (event.status === "INDEXED" || event.status === "ERROR")
      && typeof event.occurredAt === "string";
  }
}