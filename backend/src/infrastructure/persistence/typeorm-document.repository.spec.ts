import { DataSource } from "typeorm";
import type { DocumentRecord } from "../../domain/documents/document";
import { DocumentEntity } from "./document.entity";
import { OutboxEntity } from "./outbox.entity";
import { TypeOrmDocumentRepository } from "./typeorm-document.repository";

const record: DocumentRecord = {
  id: "00000000-0000-4000-8000-000000000001",
  ownerId: "00000000-0000-4000-8000-000000000002",
  title: "Manual",
  author: "Equipo",
  category: "Docs",
  tags: ["api"],
  version: "1",
  status: "PROCESSING",
  storagePath: "/tmp/file.md",
  originalName: "file.md",
  mediaType: "text/markdown",
  extractedText: null,
  error: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

describe("TypeOrmDocumentRepository", () => {
  const manager = { insert: jest.fn() };
  const documentStore = { findOne: jest.fn(), update: jest.fn() };
  const dataSource = {
    transaction: jest.fn((callback: (value: typeof manager) => Promise<unknown>) => callback(manager)),
    getRepository: jest.fn(() => documentStore),
  } as unknown as jest.Mocked<DataSource>;
  let repository: TypeOrmDocumentRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new TypeOrmDocumentRepository(dataSource);
  });

  it("writes the document and Outbox event in one transaction", async () => {
    await repository.createProcessingWithOutbox(record);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(manager.insert).toHaveBeenNthCalledWith(1, DocumentEntity, expect.objectContaining({ id: record.id, status: "PROCESSING" }));
    expect(manager.insert).toHaveBeenNthCalledWith(2, OutboxEntity, expect.objectContaining({
      aggregateId: record.id,
      eventType: "DOCUMENT_RECEIVED",
    }));
  });

  it("scopes a lookup to both document id and owner and maps its record", async () => {
    documentStore.findOne.mockResolvedValue(record);
    await expect(repository.findOwned(record.id, record.ownerId)).resolves.toMatchObject({
      id: record.id,
      ownerId: record.ownerId,
      mediaType: "text/markdown",
    });
    expect(documentStore.findOne).toHaveBeenCalledWith({ where: { id: record.id, ownerId: record.ownerId } });
  });

  it("returns null for an absent document and supports internal worker lookup", async () => {
    documentStore.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(record);
    await expect(repository.findOwned(record.id, record.ownerId)).resolves.toBeNull();
    await expect(repository.findById(record.id)).resolves.toMatchObject({ id: record.id });
  });

  it("writes the terminal processing result", async () => {
    await repository.updateProcessingResult(record.id, "ERROR", null, "parse failed");
    expect(documentStore.update).toHaveBeenCalledWith(
      { id: record.id },
      { status: "ERROR", extractedText: null, error: "parse failed" },
    );
  });
});