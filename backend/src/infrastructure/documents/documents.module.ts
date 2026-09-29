import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DOCUMENT_REPOSITORY } from "../../application/ports/document-repository.port";
import { UploadDocumentUseCase } from "../../application/documents/upload-document.use-case";
import { DocumentEntity } from "../persistence/document.entity";
import { OutboxEntity } from "../persistence/outbox.entity";
import { TypeOrmDocumentRepository } from "../persistence/typeorm-document.repository";
import { LocalDocumentStorage } from "../storage/local-document.storage";
import { DocumentsController } from "./documents.controller";
import { OutboxDispatcher } from "./outbox.dispatcher";

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity, OutboxEntity]),
    BullModule.registerQueue({ name: "documents" }),
  ],
  controllers: [DocumentsController],
  providers: [
    UploadDocumentUseCase,
    LocalDocumentStorage,
    TypeOrmDocumentRepository,
    { provide: DOCUMENT_REPOSITORY, useExisting: TypeOrmDocumentRepository },
    OutboxDispatcher,
  ],
  exports: [DOCUMENT_REPOSITORY, TypeOrmDocumentRepository],
})
export class DocumentsModule {}