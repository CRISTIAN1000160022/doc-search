import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Queue } from "bullmq";
import { IsNull, LessThanOrEqual, Repository } from "typeorm";
import { DocumentEntity } from "../persistence/document.entity";
import { OutboxEntity } from "../persistence/outbox.entity";

@Injectable()
export class OutboxDispatcher {
  private readonly logger = new Logger(OutboxDispatcher.name);
  private running = false;

  constructor(
    @InjectRepository(OutboxEntity) private readonly outbox: Repository<OutboxEntity>,
    @InjectRepository(DocumentEntity) private readonly documents: Repository<DocumentEntity>,
    @InjectQueue("documents") private readonly queue: Queue,
  ) {}

  @Interval(1000)
  async dispatchPending(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const events = await this.outbox.find({
        where: { processedAt: IsNull(), nextAttemptAt: LessThanOrEqual(new Date()) },
        order: { createdAt: "ASC" },
        take: 25,
      });

      for (const event of events) {
        try {
          await this.queue.add("index-document", event.payload, {
            jobId: event.aggregateId,
            attempts: 3,
            backoff: { type: "exponential", delay: 1000 },
            removeOnComplete: 1000,
            removeOnFail: 1000,
          });
          await this.outbox.update({ id: event.id }, { processedAt: new Date() });
        } catch (error) {
          const attempts = event.attempts + 1;
          const terminal = attempts >= 8;
          await this.outbox.update({ id: event.id }, {
            attempts,
            nextAttemptAt: new Date(Date.now() + Math.min(60_000, 1000 * 2 ** attempts)),
            ...(terminal ? { processedAt: new Date() } : {}),
          });
          if (terminal) {
            await this.documents.update({ id: event.aggregateId }, {
              status: "ERROR",
              error: "No fue posible encolar el documento después de varios intentos",
            });
          }
          this.logger.error(`No se pudo publicar el evento Outbox ${event.id}`, error);
        }
      }
    } finally {
      this.running = false;
    }
  }
}