import type { DocumentMetadata, DocumentStatusEvent, PaginatedSearchResult } from "@doc-search/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export interface LoginResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

export interface DocumentDetail extends DocumentMetadata {
  id: string;
  status: "PROCESSING" | "INDEXED" | "ERROR";
  content: string;
  createdAt: string;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(payload.message ?? `La solicitud falló (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return readJson<LoginResponse>(response);
}

export async function uploadDocument(
  token: string,
  file: File,
  metadata: DocumentMetadata,
): Promise<{ id: string; status: "PROCESSING" }> {
  const body = new FormData();
  body.set("file", file);
  body.set("title", metadata.title);
  body.set("author", metadata.author);
  body.set("category", metadata.category);
  body.set("tags", JSON.stringify(metadata.tags));
  body.set("version", metadata.version);
  const response = await fetch(`${API_BASE}/documents`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body,
  });
  return readJson(response);
}

export async function searchDocuments(
  token: string,
  query: string,
  offset: number,
  limit: number,
): Promise<PaginatedSearchResult> {
  const parameters = new URLSearchParams({ q: query, offset: String(offset), limit: String(limit) });
  const response = await fetch(`${API_BASE}/search?${parameters}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response);
}

export async function getDocument(token: string, id: string): Promise<DocumentDetail> {
  const response = await fetch(`${API_BASE}/documents/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return readJson(response);
}

export async function followDocumentStatus(
  token: string,
  id: string,
  signal: AbortSignal,
  onEvent: (event: DocumentStatusEvent) => void,
): Promise<void> {
  const response = await fetch(`${API_BASE}/documents/${encodeURIComponent(id)}/status/stream`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error(`No se pudo abrir el canal de estado (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let dataLines: string[] = [];

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line === "") {
        if (dataLines.length > 0) {
          const event = JSON.parse(dataLines.join("\n")) as DocumentStatusEvent;
          onEvent(event);
          dataLines = [];
          if (event.status === "INDEXED" || event.status === "ERROR") {
            await reader.cancel();
            return;
          }
        }
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    if (done) return;
  }
}