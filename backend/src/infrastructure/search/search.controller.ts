import { Controller, Get, Query, UseGuards, UsePipes, ValidationPipe } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { SearchQueryDto } from "./search-query.dto";
import { SearchService } from "./search.service";

@Controller("search")
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  search(@CurrentUser() user: { sub: string }, @Query() query: SearchQueryDto) {
    return this.searchService.search(user.sub, query.q.trim(), query.offset, query.limit);
  }
}