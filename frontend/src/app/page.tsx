"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  FileText,
  FileUp,
  LockKeyhole,
  LogOut,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { DocumentMetadata, DocumentStatus, PaginatedSearchResult, SearchHit } from "@doc-search/shared";
import { followDocumentStatus, getDocument, login, searchDocuments, uploadDocument, type DocumentDetail } from "../lib/api";

interface TrackedUpload {
  id: string;
  title: string;
  status: DocumentStatus;
  error?: string;
  connectionIssue?: string;
}

const PAGE_SIZE = 10;

function highlightText(fragment: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const matcher = /<mark>(.*?)<\/mark>/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(fragment)) !== null) {
    if (match.index > cursor) parts.push(fragment.slice(cursor, match.index));
    parts.push(<mark key={`${match.index}-${match[1]}`}>{match[1]}</mark>);
    cursor = matcher.lastIndex;
  }
  if (cursor < fragment.length) parts.push(fragment.slice(cursor));
  return parts;
}

function StatusPill({ status }: { status: DocumentStatus }) {
  const labels: Record<DocumentStatus, string> = {
    PROCESSING: "Procesando",
    INDEXED: "Indexado",
    ERROR: "Error",
  };
  return <span className={`status-pill status-${status.toLowerCase()}`}><span />{labels[status]}</span>;
}

export default function HomePage() {
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("demo");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PaginatedSearchResult | null>(null);
  const [selected, setSelected] = useState<SearchHit | null>(null);
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [tracked, setTracked] = useState<TrackedUpload[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [selectedFileCount, setSelectedFileCount] = useState(0);
  const [searchError, setSearchError] = useState("");
  const aborters = useRef(new Map<string, AbortController>());

  useEffect(() => () => aborters.current.forEach((controller) => controller.abort()), []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setAuthError("");
    try {
      const result = await login(username, password);
      setToken(result.accessToken);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "No fue posible iniciar sesión");
    } finally {
      setBusy(false);
    }
  }

  async function runSearch(currentToken: string, searchTerm: string, offset = 0) {
    const normalized = searchTerm.trim();
    if (!normalized) return;
    setSearchError("");
    try {
      const page = await searchDocuments(currentToken, normalized, offset, PAGE_SIZE);
      setResults(page);
      if (!page.items.some((item) => item.id === selected?.id)) {
        const first = page.items[0] ?? null;
        setSelected(first);
        setDetail(first ? await getDocument(currentToken, first.id) : null);
      }
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "No fue posible realizar la búsqueda");
    }
  }

  async function selectDocument(hit: SearchHit) {
    if (!token) return;
    setSelected(hit);
    setDetail(null);
    try {
      setDetail(await getDocument(token, hit.id));
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "No fue posible abrir el documento");
    }
  }

  function startTracking(currentToken: string, id: string, title: string) {
    const controller = new AbortController();
    aborters.current.set(id, controller);
    void (async () => {
      let attempts = 0;
      while (!controller.signal.aborted) {
        let terminal = false;
        try {
          await followDocumentStatus(currentToken, id, controller.signal, (event) => {
            setTracked((items) => items.map((item) => item.id === id
              ? { ...item, status: event.status, ...(event.error ? { error: event.error } : {}), connectionIssue: undefined }
              : item));
            terminal = event.status === "INDEXED" || event.status === "ERROR";
            if (event.status === "INDEXED" && query.trim()) void runSearch(currentToken, query);
          });
          if (terminal || controller.signal.aborted) return;
        } catch (error) {
          if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
        }

        attempts += 1;
        if (attempts > 5) {
          setTracked((items) => items.map((item) => item.id === id
            ? { ...item, connectionIssue: "No se pudo restablecer el canal de estado" }
            : item));
          return;
        }

        setTracked((items) => items.map((item) => item.id === id
          ? { ...item, connectionIssue: "Restableciendo canal de estado..." }
          : item));
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, Math.min(8000, 500 * 2 ** (attempts - 1)));
          controller.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            resolve();
          }, { once: true });
        });
      }
    })().finally(() => aborters.current.delete(id));
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const files = data.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);
    if (files.length === 0) {
      setUploadError("Selecciona uno o más archivos para continuar");
      return;
    }

    const metadata: DocumentMetadata = {
      title: String(data.get("title") ?? "").trim(),
      author: String(data.get("author") ?? "").trim(),
      category: String(data.get("category") ?? "").trim(),
      tags: String(data.get("tags") ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
      version: String(data.get("version") ?? "").trim(),
    };

    setBusy(true);
    setUploadError("");
    const failures: string[] = [];
    let uploaded = 0;
    try {
      for (const file of files) {
        const title = files.length === 1 ? metadata.title : `${metadata.title} - ${file.name}`;
        try {
          const accepted = await uploadDocument(token, file, { ...metadata, title });
          setTracked((items) => [{ id: accepted.id, title, status: accepted.status }, ...items]);
          startTracking(token, accepted.id, title);
          uploaded += 1;
        } catch (error) {
          failures.push(`${file.name}: ${error instanceof Error ? error.message : "falló la carga"}`);
        }
      }
      if (failures.length === 0) {
        form.reset();
        setSelectedFileCount(0);
        setUploadOpen(false);
      } else {
        setUploadError(`${uploaded} de ${files.length} documentos aceptados. ${failures.join("; ")}`);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <main className="login-screen">
        <div className="login-mark"><BookOpenText size={21} strokeWidth={1.8} /><span>ATLAS</span><i>DOCS</i></div>
        <section className="login-panel">
          <div className="login-kicker"><LockKeyhole size={14} /> ACCESO DE EQUIPO</div>
          <h1>Tu biblioteca<br />técnica, <em>en foco.</em></h1>
          <p className="login-copy">Consulta documentación con búsqueda indexada y seguimiento de procesamiento en tiempo real.</p>
          <form onSubmit={handleLogin} className="login-form">
            <label>Usuario<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
            <label>Contraseña<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            {authError && <p className="form-error"><CircleAlert size={15} />{authError}</p>}
            <button className="primary-button login-submit" disabled={busy} type="submit">{busy ? "Validando..." : "Entrar a la biblioteca"}<ArrowRight size={16} /></button>
          </form>
          <div className="login-foot"><ShieldCheck size={14} /> Sesión protegida con JWT</div>
        </section>
        <div className="login-side-note">CENTRO DE CONOCIMIENTO <span>·</span> 01 / 01</div>
      </main>
    );
  }

  const totalPages = results ? Math.max(1, Math.ceil(results.total / PAGE_SIZE)) : 1;
  const currentPage = results ? Math.floor(results.offset / PAGE_SIZE) + 1 : 1;

  return (
    <main className="workspace">
      <header className="topbar">
        <div className="brand"><div className="brand-icon"><BookOpenText size={19} /></div><strong>ATLAS</strong><span>DOCUMENTOS</span></div>
        <div className="topbar-right"><div className="connection-state"><span /> API CONECTADA</div><button className="icon-button logout-button" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={() => { aborters.current.forEach((controller) => controller.abort()); setToken(""); }}><LogOut size={17} /></button></div>
      </header>

      <div className="app-grid">
        <aside className="sidebar">
          <div className="sidebar-label">ESPACIO DE TRABAJO</div>
          <div className="nav-item active"><Search size={16} /><span>Buscar documentos</span><span className="nav-count">{results?.total ?? "—"}</span></div>
          <button className="nav-item nav-button" onClick={() => setUploadOpen((open) => !open)}><FileUp size={16} /><span>Cargar documento</span><span className="nav-shortcut">+</span></button>
          <div className="sidebar-divider" />
          <div className="sidebar-label tracking-label">ACTIVIDAD RECIENTE</div>
          {tracked.length === 0 ? <p className="sidebar-empty">Las cargas recientes aparecerán aquí.</p> : tracked.slice(0, 6).map((item) => (
            <div className="tracked-item" key={item.id}><div className={`tracked-dot status-${item.status.toLowerCase()}`} /><div className="tracked-copy"><span>{item.title}</span><small>{item.connectionIssue ?? item.error ?? item.id.slice(0, 8)}</small></div><StatusPill status={item.status} /></div>
          ))}
          <div className="sidebar-bottom"><span className="secure-seal"><ShieldCheck size={15} /></span><div><strong>Entorno protegido</strong><small>Autorización por propietario activa</small></div></div>
        </aside>

        <section className="main-column">
          <div className="page-heading"><div><div className="eyebrow">BIBLIOTECA / BÚSQUEDA</div><h1>Encuentra el <em>contexto.</em></h1><p>Manuales, especificaciones y guías de arquitectura en un solo lugar.</p></div><button className="upload-action" onClick={() => setUploadOpen((open) => !open)}><FileUp size={16} /> Cargar archivo</button></div>

          {uploadOpen && <section className="upload-panel">
            <div className="panel-heading"><div><span className="eyebrow">NUEVO REGISTRO</span><h2>Subir documento</h2></div><button className="icon-button" onClick={() => setUploadOpen(false)} aria-label="Cerrar panel"><X size={17} /></button></div>
            <form className="upload-form" onSubmit={handleUpload}>
              <label className="file-drop"><input name="files" type="file" accept=".txt,.pdf,.md,.markdown" multiple required onChange={(event) => setSelectedFileCount(event.currentTarget.files?.length ?? 0)} /><span className="file-icon"><FileUp size={19} /></span><span><strong>Elige uno o varios archivos técnicos</strong><small>PDF, TXT o Markdown · máximo 10 MB por archivo</small></span><ArrowDownToLine size={16} /></label>
              <div className="metadata-grid">
                <label>Título<input name="title" maxLength={240} placeholder="Manual de integración" required /></label>
                <label>Autor<input name="author" maxLength={160} placeholder="Equipo de plataforma" required /></label>
                <label>Categoría<input name="category" maxLength={120} placeholder="Arquitectura" required /></label>
                <label>Versión<input name="version" maxLength={80} placeholder="1.0" required /></label>
                <label className="wide-field">Etiquetas<input name="tags" placeholder="api, seguridad, plataforma" /></label>
              </div>
              {uploadError && <p className="form-error"><CircleAlert size={15} />{uploadError}</p>}
              <div className="upload-footer"><span><Clock3 size={14} /> Cada archivo obtiene seguimiento independiente</span><button className="primary-button" type="submit" disabled={busy}>{busy ? "Enviando..." : `Iniciar carga${selectedFileCount > 1 ? ` (${selectedFileCount})` : ""}`}<ArrowRight size={15} /></button></div>
            </form>
          </section>}

          <form className="search-form" onSubmit={(event) => { event.preventDefault(); void runSearch(token, query); }}>
            <Search size={19} className="search-icon" />
            <input aria-label="Buscar en documentos" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busca términos, frases o conceptos técnicos..." />
            <kbd>ENTER</kbd>
            <button type="submit" className="primary-button search-submit">Buscar</button>
          </form>
          <div className="search-hint"><span>ÍNDICE DE TEXTO COMPLETO</span><span>Elasticsearch <i /> resaltado de coincidencias</span></div>
          {searchError && <p className="inline-error"><CircleAlert size={15} />{searchError}</p>}

          {!results ? <div className="empty-state"><div className="empty-glyph"><Search size={25} /></div><h2>Empieza con una búsqueda</h2><p>Escribe un término técnico para explorar la biblioteca indexada.</p><div className="empty-rule"><span>01</span><i /> TEXTO COMPLETO, NO COINCIDENCIAS PARCIALES</div></div> : (
            <>
              <div className="results-toolbar"><div><span className="result-count">{results.total}</span> resultados <span className="result-query">para “{query.trim()}”</span></div><span className="sort-label">ORDENADO POR RELEVANCIA <ChevronDown size={13} /></span></div>
              <div className="result-list">
                {results.items.length === 0 ? <div className="no-results"><span>NO HAY COINCIDENCIAS</span><p>Prueba con otros términos o una frase más corta.</p></div> : results.items.map((hit, index) => (
                  <button className={`result-row ${selected?.id === hit.id ? "selected" : ""}`} key={hit.id} onClick={() => void selectDocument(hit)}>
                    <div className="result-number">{String(results.offset + index + 1).padStart(2, "0")}</div>
                    <div className="result-body"><div className="result-title-line"><FileText size={16} /><h3>{hit.title}</h3><span className="version-tag">v{hit.version}</span></div><p className="result-meta">{hit.author} <i /> {hit.category} <i /> {hit.tags.slice(0, 3).join(" · ")}</p>{hit.highlights.length > 0 && <p className="highlight-fragment">{highlightText(hit.highlights[0] ?? "")}</p>}</div>
                    <ArrowRight size={16} className="result-arrow" />
                  </button>
                ))}
              </div>
              <div className="pagination"><span>PÁGINA {currentPage} DE {totalPages}</span><div><button aria-label="Página anterior" disabled={currentPage <= 1} onClick={() => void runSearch(token, query, Math.max(0, results.offset - PAGE_SIZE))}><ArrowLeft size={15} /></button><button aria-label="Página siguiente" disabled={currentPage >= totalPages} onClick={() => void runSearch(token, query, results.offset + PAGE_SIZE)}><ArrowRight size={15} /></button></div></div>
            </>
          )}
        </section>

        <aside className="detail-column">
          <div className="detail-topline"><span>VISTA DE DOCUMENTO</span><span className="detail-index">{selected ? "01" : "—"}</span></div>
          {!selected ? <div className="detail-empty"><BookOpenText size={22} /><p>Selecciona un resultado para ver el documento completo.</p></div> : <>
            <div className="detail-header"><div className="detail-file-icon"><FileText size={19} /></div><div><span className="eyebrow">{detail?.category ?? selected.category}</span><h2>{detail?.title ?? selected.title}</h2></div></div>
            <div className="detail-status"><StatusPill status={detail?.status ?? selected.status} /><span>v{detail?.version ?? selected.version}</span></div>
            <div className="detail-meta"><div><small>AUTOR</small><span>{detail?.author ?? selected.author}</span></div><div><small>ETIQUETAS</small><span>{(detail?.tags ?? selected.tags).join(", ") || "Sin etiquetas"}</span></div><div><small>INGRESO</small><span>{detail ? new Date(detail.createdAt).toLocaleDateString("es-CO") : "—"}</span></div></div>
            <div className="content-label"><span>CONTENIDO</span><i /></div>
            <article className="document-content">{detail ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{detail.content || "_El documento no contiene texto extraíble._"}</ReactMarkdown> : <div className="content-loading"><span /> Cargando contenido...</div>}</article>
            <div className={`detail-foot ${detail?.status === "ERROR" ? "detail-foot-error" : ""}`}>
              {detail?.status === "INDEXED" ? <><Check size={14} /> Contenido procesado y disponible</> : detail?.status === "ERROR" ? <><CircleAlert size={14} /> No fue posible procesar este documento</> : <><Clock3 size={14} /> Documento en procesamiento</>}
            </div>
          </>}
        </aside>
      </div>
      <footer className="app-footer"><span>ATLAS <i /> KNOWLEDGE SYSTEM</span><span>POSTGRESQL <i /> ELASTICSEARCH <i /> SSE</span></footer>
    </main>
  );
}