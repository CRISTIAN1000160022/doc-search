import { BadRequestException } from "@nestjs/common";
import { validateUpload } from "./file-validation";

describe("validateUpload", () => {
  it("accepts a PDF by its binary signature regardless of the supplied extension", () => {
    expect(validateUpload(Buffer.from("%PDF-1.7 content"), "renamed.bin")).toEqual({
      mediaType: "application/pdf",
      extension: ".pdf",
      text: null,
    });
  });

  it.each([["guide.txt", "text/plain", ".txt"], ["guide.MD", "text/markdown", ".md"]] as const)(
    "accepts UTF-8 text file %s",
    (name, mediaType, extension) => {
      const result = validateUpload(Buffer.from("Arquitectura hexagonal"), name);
      expect(result).toEqual({ mediaType, extension, text: "Arquitectura hexagonal" });
    },
  );

  it("accepts the markdown long extension", () => {
    expect(validateUpload(Buffer.from("# Título"), "guide.markdown").extension).toBe(".md");
  });

  it("rejects empty content", () => {
    expect(() => validateUpload(Buffer.alloc(0), "guide.txt")).toThrow(BadRequestException);
  });

  it("rejects unapproved extension even when the payload is text", () => {
    expect(() => validateUpload(Buffer.from("plain text"), "payload.exe")).toThrow(BadRequestException);
  });

  it("rejects invalid UTF-8 and null bytes", () => {
    expect(() => validateUpload(Buffer.from([0xff]), "invalid.txt")).toThrow(BadRequestException);
    expect(() => validateUpload(Buffer.from("valid\u0000invalid"), "invalid.md")).toThrow(BadRequestException);
  });
});