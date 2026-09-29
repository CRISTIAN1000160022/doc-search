import { BadRequestException } from "@nestjs/common";

export interface ValidatedUpload {
  mediaType: "application/pdf" | "text/plain" | "text/markdown";
  extension: ".pdf" | ".txt" | ".md";
  text: string | null;
}

export function validateUpload(buffer: Buffer, originalName: string): ValidatedUpload {
  if (buffer.length === 0) {
    throw new BadRequestException("El archivo está vacío");
  }

  if (buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    return { mediaType: "application/pdf", extension: ".pdf", text: null };
  }

  const extension = originalName.toLowerCase().split(".").pop();
  if (extension !== "txt" && extension !== "md" && extension !== "markdown") {
    throw new BadRequestException("Formato no permitido; use PDF, TXT o Markdown");
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new BadRequestException("El documento de texto debe tener codificación UTF-8 válida");
  }

  if (text.includes("\u0000")) {
    throw new BadRequestException("El documento contiene bytes no válidos");
  }

  return {
    mediaType: extension === "txt" ? "text/plain" : "text/markdown",
    extension: extension === "txt" ? ".txt" : ".md",
    text,
  };
}