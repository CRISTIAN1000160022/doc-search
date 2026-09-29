import { ForbiddenException } from "@nestjs/common";
import { firstValueFrom, of, toArray } from "rxjs";
import type { DocumentRecord } from "../../domain/documents/document";
import type { UploadDocumentUseCase } from "../../application/documents/upload-document.use-case";
import type { DocumentRepositoryPort } from "../../application/ports/document-repository.port";
import type { RedisStatusEvents } from "../events/redis-status-events.service";
import { DocumentsController } from "./documents.controller";

const record: DocumentRecord = {
  id: "doc-1", ownerId: "owner-1", title: "Manual", author: "Team", category: "Docs", tags: [], version: "1",
  status: "INDEXED", storagePath: "/storage/doc.md", originalName: "doc.md", mediaType: "text/markdown",
  extractedText: "Full document", error: null, createdAt: new Date("2026-01-01T00:00:00Z"),
};

describe("DocumentsController", () => {
  const upload = { execute: jest.fn() } as unknown as jest.Mocked<UploadDocumentUseCase>;
  const repository = { findOwned: jest.fn() } as unknown as jest.Mocked<DocumentRepositoryPort>;
  const statusEvents = { watch: jest.fn() } as unknown as jest.Mocked<RedisStatusEvents>;
  let controller: DocumentsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DocumentsController(upload, repository, statusEvents);
  });

  it("delegates upload with the authenticated subject", async () => {
    const file = { buffer: Buffer.from("# doc") } as Express.Multer.File;
    upload.execute.mockResolvedValue({ id: "doc-1", status: "PROCESSING" });
    await expect(controller.upload({ sub: "owner-1" }, file, {} as never)).resolves.toEqual({ id: "doc-1", status: "PROCESSING" });
    expect(upload.execute).toHaveBeenCalledWith("owner-1", {}, file);
  });

  it("rejects requests that omit the file", async () => {
    await expect(controller.upload({ sub: "owner-1" }, undefined, {} as never)).rejects.toThrow("Se requiere un archivo");
  });

  it("returns document metadata and extracted content only for its owner", async () => {
    repository.findOwned.mockResolvedValue(record);
    await expect(controller.getDocument({ sub: "owner-1" }, "doc-1")).resolves.toMatchObject({ content: "Full document" });
    expect(repository.findOwned).toHaveBeenCalledWith("doc-1", "owner-1");
    repository.findOwned.mockResolvedValueOnce(null);
    await expect(controller.getDocument({ sub: "owner-2" }, "doc-1")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("streams the persisted status immediately and completes on a terminal Pub/Sub event", async () => {
    repository.findOwned.mockResolvedValue({ ...record, status: "PROCESSING", extractedText: null });
    statusEvents.watch.mockReturnValue(of({
      documentId: "doc-1", ownerId: "owner-1", status: "INDEXED", occurredAt: new Date().toISOString(),
    }));
    const received = await firstValueFrom(controller.streamStatus({ sub: "owner-1" }, "doc-1").pipe(toArray()));
    expect(received.map((message) => (message.data as { status: string }).status)).toEqual(["INDEXED"]);
  });

  it("fails the SSE stream when the document is not owned by the caller", async () => {
    repository.findOwned.mockResolvedValue(null);
    statusEvents.watch.mockReturnValue(of());
    await expect(firstValueFrom(controller.streamStatus({ sub: "other-owner" }, "doc-1"))).rejects.toBeInstanceOf(ForbiddenException);
  });
});