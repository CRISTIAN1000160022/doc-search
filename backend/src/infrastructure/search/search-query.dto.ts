import { Transform } from "class-transformer";
import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from "class-validator";

export class SearchQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  q!: string;

  @Transform(({ value }) => value === undefined ? 0 : Number(value))
  @IsInt()
  @Min(0)
  @Max(10000)
  offset = 0;

  @Transform(({ value }) => value === undefined ? 20 : Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}