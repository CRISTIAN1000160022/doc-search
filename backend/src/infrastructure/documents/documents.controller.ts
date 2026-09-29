import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { DocumentMetadataDto } from "../../application/documents/document-metadata.dto";
import { UploadDocumentUseCase } from "../../application/documents/upload-document.use-case";

@Controller("documents")
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly uploadDocument: UploadDocumentUseCase) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor("file", {
    storage: memoryStorage(),
    limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES ?? 10 * 1024 * 1024), files: 1 },
  }))
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  async upload(
    @CurrentUser() user: { sub: string },
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() metadata: DocumentMetadataDto,
  ) {
    if (!file) throw new BadRequestException("Se requiere un archivo en el campo 'file'");
    return this.uploadDocument.execute(user.sub, metadata, file);
  }
}