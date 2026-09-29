import type { ElasticsearchService } from "@nestjs/elasticsearch";
import type { DocumentRecord } from "../../domain/documents/document";
import { ElasticsearchDocumentIndex } from "./elasticsearch-document-index.service";

describe("ElasticsearchDocumentIndex", () => {
  const exists = jest.fn();
  const create = jest.fn();
  const index = jest.fn();
  const deleteDocument = jest.fn();
  const elasticsearch = {
    indices: { exists, create },
    index,
    delete: deleteDocument,
  } as unknown as ElasticsearchService;
  let service: ElasticsearchDocumentIndex;

  beforeEach(() => {
    jest.clearAllMocks();
    exists.mockResolvedValue(false);
    service = new ElasticsearchDocumentIndex(elasticsearch);
  });

  it("creates the mapped search index when it is missing", async () => {
    await service.onModuleInit();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ index: "documents" }));
  });

  it("leaves an existing index intact", async () => {
    exists.mockResolvedValue(true);
    await service.onModuleInit();
    expect(create).not.toHaveBeenCalled();
  });

  it("tolerates another process creating the index concurrently", async () => {
    exists.mockResolvedValue(false);
    create.mockRejectedValueOnce({ meta: { statusCode: 400, body: { error: { type: "resource_already_exists_exception" } } } });
    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });

  it("indexes by document id with owner and extracted content", async () => {
    const record = {
      id: "doc-1", ownerId: "owner-1", title: "Manual", author: "Team", category: "Docs", tags: [],
      version: "1", createdAt: new Date("2026-01-01T00:00:00Z"),
    } as unknown as DocumentRecord;
    await service.index(record, "full text");
    expect(index).toHaveBeenCalledWith(expect.objectContaining({
      id: "doc-1",
      document: expect.objectContaining({ ownerId: "owner-1", content: "full text" }),
      refresh: "wait_for",
    }));
  });

  it("removes a failed or stale index document", async () => {
    await service.delete("doc-1");
    expect(deleteDocument).toHaveBeenCalledWith({ index: "documents", id: "doc-1", refresh: "wait_for" });
  });
});