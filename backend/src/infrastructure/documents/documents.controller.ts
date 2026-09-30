import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  MessageEvent,
  NotFoundException,
  Post,
  Param,
  Sse,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { Observable, defer, filter, from, map, merge, of, takeWhile } from "rxjs";
import { DOCUMENT_REPOSITORY, type DocumentRepositoryPort } from "../../application/ports/document-repository.port";
import { Inject } from "@nestjs/common";
import { RedisStatusEvents } from "../events/redis-status-events.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { DocumentMetadataDto } from "../../application/documents/document-metadata.dto";
import { UploadDocumentUseCase } from "../../application/documents/upload-document.use-case";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { basename } from "node:path";

@Controller("documents")
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private readonly uploadDocument: UploadDocumentUseCase,
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: DocumentRepositoryPort,
    private readonly statusEvents: RedisStatusEvents,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor("file", {
    storage: memoryStorage(),
    limits: {
      fileSize: Number(process.env.MAX_UPLOAD_BYTES ?? 10 * 1024 * 1024),
      files: 1,
      fields: 5,
      fieldSize: 16 * 1024,
      parts: 10,
    },
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

  @Get(":id")
  async getDocument(@CurrentUser() user: { sub: string }, @Param("id") id: string) {
    const document = await this.documents.findOwned(id, user.sub);
    if (!document) throw new ForbiddenException("Documento inexistente o no autorizado");
    return {
      id: document.id,
      title: document.title,
      author: document.author,
      category: document.category,
      tags: document.tags,
      version: document.version,
      status: document.status,
      content: document.extractedText ?? "",
      createdAt: document.createdAt,
      originalName: document.originalName,
      mediaType: document.mediaType,
    };
  }

  @Get(":id/file")
  @Header("X-Content-Type-Options", "nosniff")
  async getOriginalFile(@CurrentUser() user: { sub: string }, @Param("id") id: string): Promise<StreamableFile> {
    const document = await this.documents.findOwned(id, user.sub);
    if (!document) throw new ForbiddenException("Documento inexistente o no autorizado");

    try {
      await stat(document.storagePath);
    } catch {
      throw new NotFoundException("El archivo original ya no está disponible");
    }

    const allowedMediaTypes = ["application/pdf", "text/plain", "text/markdown"] as const;
    const mediaType = allowedMediaTypes.includes(document.mediaType) ? document.mediaType : "application/octet-stream";
    const safeName = basename(document.originalName).replace(/[\r\n"]/g, "_");

    return new StreamableFile(createReadStream(document.storagePath), {
      type: mediaType,
      disposition: `inline; filename*=UTF-8''${encodeURIComponent(safeName)}`,
    });
  }

  @Sse(":id/status/stream")
  streamStatus(@CurrentUser() user: { sub: string }, @Param("id") id: string): Observable<MessageEvent> {
    const updates = this.statusEvents.watch(id).pipe(
      filter((event) => event.ownerId === user.sub),
      map((event) => ({ type: "status", data: event })),
    );
    const initial = defer(() => from(this.documents.findOwned(id, user.sub))).pipe(
      map((document) => {
        if (!document) throw new ForbiddenException("Documento inexistente o no autorizado");
        return {
          type: "status",
          data: {
            documentId: document.id,
            status: document.status,
            error: document.error,
            occurredAt: document.createdAt.toISOString(),
          },
        };
      }),
    );

    return merge(updates, initial).pipe(
      takeWhile((event) => event.data.status === "PROCESSING", true),
    );
  }
}