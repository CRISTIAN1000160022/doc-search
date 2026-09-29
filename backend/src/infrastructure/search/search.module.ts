import { Module } from "@nestjs/common";
import { ElasticsearchModule } from "@nestjs/elasticsearch";
import { AuthModule } from "../auth/auth.module";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import { ElasticsearchDocumentIndex } from "./elasticsearch-document-index.service";

@Module({
  imports: [
    AuthModule,
    ElasticsearchModule.register({ node: process.env.ELASTICSEARCH_NODE ?? "http://elasticsearch:9200" }),
  ],
  controllers: [SearchController],
  providers: [JwtAuthGuard, SearchService, ElasticsearchDocumentIndex],
  exports: [ElasticsearchDocumentIndex],
})
export class SearchModule {}