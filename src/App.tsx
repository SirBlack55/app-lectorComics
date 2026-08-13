import { useEffect, useMemo, useRef, useState } from "react";
import { PageFlip } from "page-flip/dist/js/page-flip.module.js";
import { importCbz, importImageBatch, importPdf } from "./lib/comicImporter";
import { useLibrary } from "./hooks/useLibrary";
import type { ComicRecord } from "./types";

type ImportMode = "cbz" | "images" | "pdf";
type ReaderMode = "single" | "spread";

function getPreferredReaderMode(): ReaderMode {
  if (typeof window === "undefined") return "single";

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const hasRoomForSpread = viewportWidth >= 720 && viewportHeight >= 360;

  return viewportWidth > viewportHeight && hasRoomForSpread ? "spread" : "single";
}

function normalizeReaderIndex(index: number, totalPages: number): number {
  if (totalPages <= 0) return 0;
  return Math.min(Math.max(index, 0), totalPages - 1);
}

function getReaderLabel(page: number, totalPages: number, mode: ReaderMode): string {
  if (mode === "spread" && page + 1 < totalPages) {
    return `Paginas ${page + 1}-${page + 2} de ${totalPages}`;
  }

  return `Pagina ${page + 1} de ${totalPages}`;
}

function FlipBookReader({
  comic,
  currentPage,
  mode,
  onPageChange
}: {
  comic: ComicRecord;
  currentPage: number;
  mode: ReaderMode;
  onPageChange: (page: number) => void;
}) {
  const bookRef = useRef<HTMLDivElement | null>(null);
  const pageFlipRef = useRef<PageFlip | null>(null);
  const onPageChangeRef = useRef(onPageChange);

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  useEffect(() => {
    const bookElement = bookRef.current;
    if (!bookElement) return;

    bookElement.innerHTML = "";

    const pageElements = comic.pages.map((page, index) => {
      const pageElement = document.createElement("section");
      pageElement.className = "st-comic-page";
      pageElement.dataset.density = "soft";

      const image = document.createElement("img");
      image.src = page;
      image.alt = `Pagina ${index + 1} de ${comic.title}`;
      image.className = "st-comic-page-image";
      image.draggable = false;

      const number = document.createElement("span");
      number.className = "st-comic-page-number";
      number.textContent = String(index + 1);

      pageElement.append(image, number);
      return pageElement;
    });

    const startPage = normalizeReaderIndex(currentPage, comic.pages.length);
    const pageFlip = new PageFlip(bookElement, {
      width: 720,
      height: 1040,
      size: "stretch",
      minWidth: mode === "single" ? 300 : 280,
      maxWidth: mode === "single" ? 680 : 1180,
      minHeight: mode === "single" ? 260 : 220,
      maxHeight: 1400,
      startPage,
      drawShadow: true,
      flippingTime: 900,
      usePortrait: mode === "single",
      startZIndex: 4,
      autoSize: true,
      maxShadowOpacity: 0.78,
      showCover: false,
      mobileScrollSupport: false,
      swipeDistance: 24,
      showPageCorners: true,
      disableFlipByClick: false
    });

    pageFlip.on("flip", (event) => {
      if (typeof event.data === "number") {
        onPageChangeRef.current(normalizeReaderIndex(event.data, comic.pages.length));
      }
    });

    pageFlip.loadFromHTML(pageElements);
    pageFlipRef.current = pageFlip;

    const resizeObserver = new ResizeObserver(() => {
      window.requestAnimationFrame(() => pageFlip.update());
    });
    resizeObserver.observe(bookElement);

    return () => {
      resizeObserver.disconnect();
      pageFlip.off("flip");
      pageFlip.getUI().destroy();
      pageFlipRef.current = null;
      bookElement.innerHTML = "";
    };
  }, [comic.id, comic.pages, comic.title, mode]);

  useEffect(() => {
    const pageFlip = pageFlipRef.current;
    if (!pageFlip) return;

    const nextPage = normalizeReaderIndex(currentPage, comic.pages.length);
    if (pageFlip.getCurrentPageIndex() !== nextPage) {
      pageFlip.turnToPage(nextPage);
    }
  }, [comic.pages.length, currentPage]);

  return (
    <div className={`reader-stage pageflip-stage ${mode}`}>
      <div ref={bookRef} className="st-pageflip-root" />
    </div>
  );
}

function App() {
  const { comics, isLoading, continueReading, upsertComic, updateProgress, removeComic } = useLibrary();
  const [activeComic, setActiveComic] = useState<ComicRecord | null>(null);
  const [activePage, setActivePage] = useState(0);
  const [readerMode, setReaderMode] = useState<ReaderMode>("single");
  const [statusMessage, setStatusMessage] = useState("Listo para importar.");
  const cbzInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const imagesInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!activeComic) return;
    setActivePage(normalizeReaderIndex(activeComic.progress.currentPage, activeComic.pages.length));
    setReaderMode(getPreferredReaderMode());
  }, [activeComic]);

  useEffect(() => {
    if (!activeComic) return;

    function handleViewportChange() {
      setReaderMode(getPreferredReaderMode());
    }

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
    };
  }, [activeComic]);

  const completedCount = comics.filter((comic) => comic.progress.currentPage >= comic.pages.length - 1).length;
  const readerLabel = useMemo(() => {
    if (!activeComic) return "";
    return getReaderLabel(activePage, activeComic.pages.length, readerMode);
  }, [activeComic, activePage, readerMode]);

  async function handleImport(mode: ImportMode, files: FileList | null) {
    if (!files || files.length === 0) return;

    try {
      setStatusMessage("Importando y preparando paginas...");
      const comic =
        mode === "cbz"
          ? await importCbz(files[0])
          : mode === "pdf"
            ? await importPdf(files[0])
            : await importImageBatch(files);
      await upsertComic(comic);
      setActiveComic(comic);
      setStatusMessage(`"${comic.title}" ya esta en tu biblioteca.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "No se pudo importar el comic.");
    }
  }

  async function persistReadingProgress(comic: ComicRecord, page: number) {
    await updateProgress(comic.id, page);
  }

  function handleReaderPageChange(page: number) {
    if (!activeComic) return;
    setActivePage(page);
    void persistReadingProgress(activeComic, page);
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">PWA para movil, tablet y web</p>
          <h1>Tu lector personal de comics, instalable y multiplataforma.</h1>
          <p className="hero-copy">
            Importa un archivo PDF, un CBZ o una secuencia de imagenes, guardalo en tu navegador
            y sigue leyendo desde donde lo dejaste.
          </p>
        </div>

        <div className="hero-panel">
          <div className="hero-stat">
            <span>{comics.length}</span>
            <small>comics en biblioteca</small>
          </div>
          <div className="hero-stat">
            <span>{completedCount}</span>
            <small>terminados</small>
          </div>
          <div className="hero-stat">
            <span>{continueReading ? `${continueReading.progress.currentPage + 1}` : "0"}</span>
            <small>pagina actual</small>
          </div>
        </div>
      </header>

      <main className="content-grid">
        <section className="sidebar-card install-card">
          <h2>Instalacion</h2>
          <ol>
            <li>En iPhone, abre Safari y usa "Anadir a pantalla de inicio".</li>
            <li>En Android, abre Chrome y usa "Instalar app" o "Anadir a pantalla de inicio".</li>
            <li>En web, abre la URL directamente desde tu navegador.</li>
          </ol>
          <p className="status-note">{statusMessage}</p>
        </section>

        <section className="sidebar-card import-card">
          <h2>Importar</h2>
          <p>Ahora mismo puedes importar `PDF`, `CBZ` o varias imagenes como un tomo.</p>
          <div className="action-stack">
            <button type="button" className="primary-button" onClick={() => pdfInputRef.current?.click()}>
              Importar PDF
            </button>
            <button type="button" className="primary-button" onClick={() => cbzInputRef.current?.click()}>
              Importar CBZ
            </button>
            <button type="button" className="secondary-button" onClick={() => imagesInputRef.current?.click()}>
              Importar imagenes
            </button>
          </div>

          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(event) => void handleImport("pdf", event.target.files)}
          />
          <input
            ref={cbzInputRef}
            type="file"
            accept=".cbz,application/vnd.comicbook+zip,application/zip"
            hidden
            onChange={(event) => void handleImport("cbz", event.target.files)}
          />
          <input
            ref={imagesInputRef}
            type="file"
            accept="image/*"
            hidden
            multiple
            onChange={(event) => void handleImport("images", event.target.files)}
          />
        </section>

        <section className="sidebar-card continue-card">
          <h2>Seguir leyendo</h2>
          {continueReading ? (
            <button type="button" className="continue-button" onClick={() => setActiveComic(continueReading)}>
              <img src={continueReading.cover} alt="" />
              <div>
                <strong>{continueReading.title}</strong>
                <span>
                  Pagina {continueReading.progress.currentPage + 1} de {continueReading.pages.length}
                </span>
              </div>
            </button>
          ) : (
            <p>Todavia no hay lectura en curso. Importa algo y empezamos.</p>
          )}
        </section>

        <section className="library-panel">
          <div className="section-heading">
            <h2>Biblioteca</h2>
            <p>{isLoading ? "Cargando..." : "Todo queda guardado en este navegador."}</p>
          </div>

          <div className="comic-grid">
            {comics.map((comic) => (
              <article key={comic.id} className="comic-card">
                <button type="button" className="comic-cover-button" onClick={() => setActiveComic(comic)}>
                  <img src={comic.cover} alt={`Portada de ${comic.title}`} className="comic-cover" />
                </button>
                <div className="comic-meta">
                  <div>
                    <h3>{comic.title}</h3>
                    {comic.subtitle ? <p>{comic.subtitle}</p> : null}
                  </div>
                  <span className="pill">{comic.source.toUpperCase()}</span>
                </div>
                <div className="progress-row">
                  <progress max={comic.pages.length} value={comic.progress.currentPage + 1} />
                  <span>
                    {comic.progress.currentPage + 1}/{comic.pages.length}
                  </span>
                </div>
                <div className="card-actions">
                  <button type="button" className="inline-button" onClick={() => setActiveComic(comic)}>
                    Abrir
                  </button>
                  <button
                    type="button"
                    className="inline-button danger"
                    onClick={() => void removeComic(comic.id)}
                  >
                    Borrar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      {activeComic ? (
        <div className="reader-shell" role="dialog" aria-modal="true">
          <div className="reader-topbar">
            <div>
              <p className="eyebrow">Lector</p>
              <h2>{activeComic.title}</h2>
            </div>

            <div className="reader-topbar-actions">
              <div className="mode-toggle" role="tablist" aria-label="Modo de lectura">
                <button
                  type="button"
                  className={readerMode === "single" ? "mode-button active" : "mode-button"}
                  onClick={() => setReaderMode("single")}
                >
                  1 pag.
                </button>
                <button
                  type="button"
                  className={readerMode === "spread" ? "mode-button active" : "mode-button"}
                  onClick={() => setReaderMode("spread")}
                >
                  2 pags.
                </button>
              </div>

              <button type="button" className="close-button" onClick={() => setActiveComic(null)}>
                Cerrar
              </button>
            </div>
          </div>

          <FlipBookReader
            comic={activeComic}
            currentPage={activePage}
            mode={readerMode}
            onPageChange={handleReaderPageChange}
          />

          <div className="reader-controls">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setActivePage((page) => normalizeReaderIndex(page - 1, activeComic.pages.length))}
            >
              Anterior
            </button>

            <label className="range-wrap">
              <span>{readerLabel}</span>
              <input
                type="range"
                min={0}
                max={activeComic.pages.length - 1}
                step={1}
                value={activePage}
                onChange={(event) => {
                  const nextPage = normalizeReaderIndex(Number(event.target.value), activeComic.pages.length);
                  setActivePage(nextPage);
                  void persistReadingProgress(activeComic, nextPage);
                }}
              />
            </label>

            <button
              type="button"
              className="primary-button"
              onClick={() => setActivePage((page) => normalizeReaderIndex(page + 1, activeComic.pages.length))}
            >
              Siguiente
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
