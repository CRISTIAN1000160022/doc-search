import { Transform } from "class-transformer";
import { ArrayMaxSize, IsArray, IsNotEmpty, IsString, MaxLength } from "class-validator";

export class DocumentMetadataDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(240)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  author!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  category!: string;

  @Transform(({ value }: { value: unknown }) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== "string") return value;
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : value.split(",").map((tag) => tag.trim()).filter(Boolean);
    } catch {
      return value.split(",").map((tag) => tag.trim()).filter(Boolean);
    }
  })
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  tags!: string[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  version!: string;
}