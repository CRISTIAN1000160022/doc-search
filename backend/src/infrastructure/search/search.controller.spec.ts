import type { SearchService } from "./search.service";
import { SearchController } from "./search.controller";

describe("SearchController", () => {
  const service = { search: jest.fn() } as unknown as jest.Mocked<SearchService>;
  let controller: SearchController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SearchController(service);
  });

  it("passes the authenticated owner and bounded search parameters to the service", async () => {
    service.search.mockResolvedValue({ items: [], total: 0, offset: 10, limit: 5 });
    await expect(controller.search({ sub: "owner-1" }, { q: "  index  ", offset: 10, limit: 5 }))
      .resolves.toMatchObject({ offset: 10, limit: 5 });
    expect(service.search).toHaveBeenCalledWith("owner-1", "index", 10, 5);
  });
});