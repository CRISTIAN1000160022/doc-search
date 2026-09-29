import { BadRequestException, PayloadTooLargeException } from "@nestjs/common";
import type { DocumentMetadata } from "@doc-search/shared";
import type { DocumentRepositoryPort } from "../ports/document-repository.port";
import { LocalDocumentStorage } from "../../infrastructure/storage/local-document.storage";
import { UploadDocumentUseCase } from "./upload-document.use-case";

const metadata: DocumentMetadata = {
  title: "Guía de búsqueda",
  author: "Equipo Plataforma",
  category: "Arquitectura",
  tags: ["elasticsearch"],
  version: "1.0",
};

function makeFile(buffer: Buffer, originalname = "guide.md"): Express.Multer.File {
  return { buffer, originalname, size: buffer.length } as Express.Multer.File;
}

describe("UploadDocumentUseCase", () => {
  const repository = { createProcessingWithOutbox: jest.fn() } as unknown as jest.Mocked<DocumentRepositoryPort>;
  const storage = {
    save: jest.fn(),
    remove: jest.fn(),
  } as unknown as jest.Mocked<LocalDocumentStorage>;
  let useCase: UploadDocumentUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MAX_UPLOAD_BYTES = "1000";
    storage.save.mockResolvedValue({ id: "storage-id", path: "/tmp/storage-id.md" });
    repository.createProcessingWithOutbox.mockResolvedValue();
    useCase = new UploadDocumentUseCase(repository, storage);
  });

  it("stores, persists PROCESSING with an outbox event, and returns a tracking id", async () => {
    const result = await useCase.execute("owner-1", metadata, makeFile(Buffer.from("# Manual")));

    expect(result).toMatchObject({ status: "PROCESSING" });
    expect(result.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(storage.save).toHaveBeenCalledWith(Buffer.from("# Manual"), ".md");
    expect(repository.createProcessingWithOutbox).toHaveBeenCalledWith(expect.objectContaining({
      id: result.id,
      ownerId: "owner-1",
      status: "PROCESSING",
      storagePath: "/tmp/storage-id.md",
      mediaType: "text/markdown",
    }));
  });

  it("rejects a file larger than the configured bound before storing", async () => {
    await expect(useCase.execute("owner-1", metadata, makeFile(Buffer.alloc(1001))))
      .rejects.toBeInstanceOf(PayloadTooLargeException);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it("rejects invalid file data before writing to storage", async () => {
    await expect(useCase.execute("owner-1", metadata, makeFile(Buffer.from("bad"), "bad.exe")))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it("removes the stored file when the database transaction fails", async () => {
    repository.createProcessingWithOutbox.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(useCase.execute("owner-1", metadata, makeFile(Buffer.from("# Manual"))))
      .rejects.toThrow("database unavailable");
    expect(storage.remove).toHaveBeenCalledWith("/tmp/storage-id.md");
  });
});