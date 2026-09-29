import type { Queue } from "bullmq";
import type { Repository } from "typeorm";
import { DocumentEntity } from "../persistence/document.entity";
import { OutboxEntity } from "../persistence/outbox.entity";
import type { RedisStatusEvents } from "../events/redis-status-events.service";
import { OutboxDispatcher } from "./outbox.dispatcher";

describe("OutboxDispatcher", () => {
  const outbox = { find: jest.fn(), update: jest.fn() } as unknown as jest.Mocked<Repository<OutboxEntity>>;
  const documents = { update: jest.fn() } as unknown as jest.Mocked<Repository<DocumentEntity>>;
  const queue = { add: jest.fn() } as unknown as jest.Mocked<Queue>;
  const statusEvents = { publish: jest.fn() } as unknown as jest.Mocked<RedisStatusEvents>;
  let dispatcher: OutboxDispatcher;

  beforeEach(() => {
    jest.clearAllMocks();
    outbox.find.mockResolvedValue([]);
    queue.add.mockResolvedValue({} as never);
    statusEvents.publish.mockResolvedValue();
    dispatcher = new OutboxDispatcher(outbox, documents, queue, statusEvents);
  });

  it("enqueues pending work with a deterministic id and marks it processed", async () => {
    const event = { id: "event-1", aggregateId: "doc-1", payload: { documentId: "doc-1", ownerId: "owner-1" }, attempts: 0 };
    outbox.find.mockResolvedValue([event] as unknown as OutboxEntity[]);
    await dispatcher.dispatchPending();
    expect(queue.add).toHaveBeenCalledWith("index-document", event.payload, expect.objectContaining({ jobId: "doc-1" }));
    expect(outbox.update).toHaveBeenCalledWith({ id: "event-1" }, expect.objectContaining({ processedAt: expect.any(Date) }));
  });

  it("schedules a retry after a transient queue failure", async () => {
    outbox.find.mockResolvedValue([{ id: "event-1", aggregateId: "doc-1", payload: {}, attempts: 1 }] as unknown as OutboxEntity[]);
    queue.add.mockRejectedValueOnce(new Error("redis unavailable"));
    await dispatcher.dispatchPending();
    expect(outbox.update).toHaveBeenCalledWith({ id: "event-1" }, expect.objectContaining({
      attempts: 2,
      nextAttemptAt: expect.any(Date),
    }));
    expect(documents.update).not.toHaveBeenCalled();
  });

  it("marks a document ERROR after the final queue failure", async () => {
    outbox.find.mockResolvedValue([{ id: "event-1", aggregateId: "doc-1", payload: { ownerId: "owner-1" }, attempts: 7 }] as unknown as OutboxEntity[]);
    queue.add.mockRejectedValueOnce(new Error("redis unavailable"));
    await dispatcher.dispatchPending();
    expect(documents.update).toHaveBeenCalledWith({ id: "doc-1" }, expect.objectContaining({ status: "ERROR" }));
    expect(statusEvents.publish).toHaveBeenCalledWith(expect.objectContaining({ ownerId: "owner-1", status: "ERROR" }));
  });

  it("does not overlap dispatch loops", async () => {
    let release: (() => void) | undefined;
    outbox.find.mockImplementationOnce(() => new Promise((resolve) => {
      release = () => resolve([]);
    }));
    const pending = dispatcher.dispatchPending();
    await dispatcher.dispatchPending();
    expect(outbox.find).toHaveBeenCalledTimes(1);
    release?.();
    await pending;
  });
});