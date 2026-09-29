import type { ElasticsearchService } from "@nestjs/elasticsearch";
import { SearchService } from "./search.service";

describe("SearchService", () => {
  const elasticsearch = { search: jest.fn() } as unknown as jest.Mocked<ElasticsearchService>;
  let service: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SearchService(elasticsearch);
  });

  it("returns owner-filtered paginated results with Elasticsearch highlight fragments", async () => {
    elasticsearch.search.mockResolvedValue({
      hits: {
        total: { value: 2, relation: "eq" },
        hits: [{
          _source: {
            id: "doc-1", ownerId: "owner-1", title: "Search", author: "Team", category: "Docs",
            tags: ["index"], version: "1", createdAt: "2026-09-29T10:00:00.000Z",
          },
          highlight: { content: ["<mark>index</mark> speed"] },
        }],
      },
    } as never);

    await expect(service.search("owner-1", "index", 20, 10)).resolves.toMatchObject({
      total: 2,
      offset: 20,
      limit: 10,
      items: [{ id: "doc-1", status: "INDEXED", highlights: ["<mark>index</mark> speed"] }],
    });
    const request = elasticsearch.search.mock.calls[0]?.[0] as { from: number; size: number; query: { bool: { filter: unknown[] } } };
    expect(request.from).toBe(20);
    expect(request.size).toBe(10);
    expect(request.query.bool.filter).toEqual([{ term: { ownerId: "owner-1" } }]);
  });

  it("handles numeric totals and ignores hits without a source", async () => {
    elasticsearch.search.mockResolvedValue({ hits: { total: 0, hits: [{ _source: undefined }] } } as never);
    await expect(service.search("owner-1", "missing", 0, 20)).resolves.toMatchObject({ total: 0, items: [] });
  });

  it("handles a hit without optional highlight fields", async () => {
    elasticsearch.search.mockResolvedValue({
      hits: {
        total: { value: 1, relation: "gte" },
        hits: [{ _source: {
          id: "doc-2", ownerId: "owner-1", title: "Guide", author: "Team", category: "Docs",
          tags: [], version: "2", createdAt: "2026-09-29T10:00:00.000Z",
        } }],
      },
    } as never);
    await expect(service.search("owner-1", "guide", 0, 20)).resolves.toMatchObject({
      total: 1,
      items: [{ id: "doc-2", highlights: [] }],
    });
  });

  it("propagates search service errors", async () => {
    elasticsearch.search.mockRejectedValueOnce(new Error("elasticsearch unavailable"));
    await expect(service.search("owner-1", "term", 0, 20)).rejects.toThrow("elasticsearch unavailable");
  });
});