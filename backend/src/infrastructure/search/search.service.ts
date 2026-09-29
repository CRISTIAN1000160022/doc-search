import { Injectable } from "@nestjs/common";
import { ElasticsearchService } from "@nestjs/elasticsearch";
import type { PaginatedSearchResult, SearchHit } from "@doc-search/shared";
import { DOCUMENT_INDEX } from "./elasticsearch-document-index.service";

interface IndexedSource {
  id: string;
  ownerId: string;
  title: string;
  author: string;
  category: string;
  tags: string[];
  version: string;
  createdAt: string;
}

@Injectable()
export class SearchService {
  constructor(private readonly elasticsearch: ElasticsearchService) {}

  async search(ownerId: string, query: string, offset: number, limit: number): Promise<PaginatedSearchResult> {
    const response = await this.elasticsearch.search<IndexedSource>({
      index: DOCUMENT_INDEX,
      from: offset,
      size: limit,
      track_total_hits: true,
      query: {
        bool: {
          filter: [{ term: { ownerId } }],
          must: [{
            multi_match: {
              query,
              fields: ["title^4", "author^2", "category^2", "tags^2", "version", "content"],
              type: "best_fields",
              operator: "and",
            },
          }],
        },
      },
      highlight: {
        pre_tags: ["<mark>"],
        post_tags: ["</mark>"],
        fields: { content: { fragment_size: 180, number_of_fragments: 3 }, title: {} },
      },
      sort: [{ _score: { order: "desc" } }, { createdAt: { order: "desc" } }],
    });

    const items: SearchHit[] = response.hits.hits.flatMap((hit) => {
      const source = hit._source;
      if (!source) return [];
      return [{
        id: source.id,
        title: source.title,
        author: source.author,
        category: source.category,
        tags: source.tags,
        version: source.version,
        status: "INDEXED",
        createdAt: source.createdAt,
        highlights: Object.values(hit.highlight ?? {}).flat(),
      }];
    });
    const total = typeof response.hits.total === "number" ? response.hits.total : response.hits.total?.value ?? 0;

    return { items, total, offset, limit };
  }
}