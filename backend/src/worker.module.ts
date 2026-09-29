import { Module } from "@nestjs/common";
import { AppModule } from "./app.module";
import { DocumentsModule } from "./infrastructure/documents/documents.module";
import { DocumentProcessor } from "./infrastructure/documents/document.processor";

@Module({ imports: [AppModule, DocumentsModule], providers: [DocumentProcessor] })
export class WorkerModule {}