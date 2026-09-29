import type { Job } from "bullmq";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pdfParse from "pdf-parse";
import type { DocumentRecord } from "../../domain/documents/document";
import type { TypeOrmDocumentRepository } from "../persistence/typeorm-document.repository";
import type { ElasticsearchDocumentIndex } from "../search/elasticsearch-document-index.service";
import type { RedisStatusEvents } from "../events/redis-status-events.service";
import { DocumentProcessor } from "./document.processor";

jest.mock("pdf-parse", () => ({ __esModule: true, default: jest.fn() }));

describe("DocumentProcessor", () => {
  let directory: string;
  let document: DocumentRecord;
  const repository = {
    findById: jest.fn(),
    updateProcessingResult: jest.fn(),
  } as unknown as jest.Mocked<TypeOrmDocumentRepository>;
  const index = {
    index: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<ElasticsearchDocumentIndex>;
  const events = { publish: jest.fn() } as unknown as jest.Mocked<RedisStatusEvents>;
  let processor: DocumentProcessor;

  beforeEach(async () => {
    jest.clearAllMocks();
    directory = await mkdtemp(join(tmpdir(), "doc-search-worker-"));
    document = {
      id: "doc-1", ownerId: "owner-1", title: "Manual", author: "Team", category: "Docs", tags: [],
      version: "1", status: "PROCESSING", storagePath: join(directory, "manual.txt"), originalName: "manual.txt",
      mediaType: "text/plain", extractedText: null, error: null, createdAt: new Date("2026-01-01T00:00:00Z"),
    };
    repository.findById.mockResolvedValue(document);
    repository.updateProcessingResult.mockResolvedValue();
    index.index.mockResolvedValue();
    index.delete.mockResolvedValue();
    events.publish.mockResolvedValue(undefined);
    processor = new DocumentProcessor(repository, index, events);
  });

  afterEach(async () => rm(directory, { recursive: true, force: true }));

  it("extracts text, indexes it, persists INDEXED and publishes status", async () => {
    await writeFile(document.storagePath, "Searchable content");
    await processor.process({ data: { documentId: "doc-1", ownerId: "owner-1" } } as Job);
    expect(index.index).toHaveBeenCalledWith(document, "Searchable content");
    expect(repository.updateProcessingResult).toHaveBeenCalledWith("doc-1", "INDEXED", "Searchable content", null);
    expect(events.publish).toHaveBeenCalledWith(expect.objectContaining({ documentId: "doc-1", status: "INDEXED" }));
  });

  it("extracts PDF content through the PDF parser", async () => {
    document.mediaType = "application/pdf";
    await writeFile(document.storagePath, "%PDF-1.7");
    (pdfParse as jest.Mock).mockResolvedValueOnce({ text: "PDF extracted" });
    await processor.process({ data: { documentId: "doc-1", ownerId: "owner-1" } } as Job);
    expect(index.index).toHaveBeenCalledWith(document, "PDF extracted");
  });

  it("rejects missing records and owner mismatches", async () => {
    repository.findById.mockResolvedValueOnce(null).mockResolvedValueOnce(document);
    await expect(processor.process({ data: { documentId: "missing", ownerId: "owner-1" } } as Job)).rejects.toThrow();
    await expect(processor.process({ data: { documentId: "doc-1", ownerId: "other-owner" } } as Job)).rejects.toThrow();
  });

  it("does not mark a job ERROR before its final retry", async () => {
    await processor.onFailed({ data: { documentId: "doc-1" }, opts: { attempts: 3 }, attemptsMade: 2 } as Job, new Error("retry"));
    expect(repository.updateProcessingResult).not.toHaveBeenCalled();
  });

  it("marks final failures ERROR, removes partial index data and notifies subscribers", async () => {
    await processor.onFailed({ data: { documentId: "doc-1" }, opts: { attempts: 3 }, attemptsMade: 3 } as Job, new Error("parse failed"));
    expect(repository.updateProcessingResult).toHaveBeenCalledWith("doc-1", "ERROR", null, "parse failed");
    expect(index.delete).toHaveBeenCalledWith("doc-1");
    expect(events.publish).toHaveBeenCalledWith(expect.objectContaining({ status: "ERROR", error: "parse failed" }));
  });

  it("ignores a failure event without a job", async () => {
    await processor.onFailed(undefined, new Error("orphan"));
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it("continues terminal failure handling if stale index cleanup fails", async () => {
    index.delete.mockRejectedValueOnce(new Error("index unavailable"));
    await processor.onFailed({ data: { documentId: "doc-1" }, opts: { attempts: 1 }, attemptsMade: 1 } as Job, new Error("parse failed"));
    expect(events.publish).toHaveBeenCalledWith(expect.objectContaining({ status: "ERROR" }));
  });
});