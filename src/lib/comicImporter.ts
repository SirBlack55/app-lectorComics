import JSZip from "jszip";
import { createExtractorFromData } from "node-unrar-js/esm";
import unrarWasmUrl from "node-unrar-js/esm/js/unrar.wasm?url";
import { createId } from "./id";
import type { ComicRecord, ComicSource } from "../types";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"];

function sortNaturally(values: string[]): string[] {
  return [...values].sort((a, b) => {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  });
}

function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function readMagicBytes(file: File, length: number): Promise<Uint8Array> {
  const buffer = await file.slice(0, length).arrayBuffer();
  return new Uint8Array(buffer);
}

function looksLikeZip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function looksLikeRar(bytes: Uint8Array): boolean {
  // Firma "Rar!" + 0x1A 0x07, comun a RAR4 y RAR5.
  return bytes[0] === 0x52 && bytes[1] === 0x61 && bytes[2] === 0x72 && bytes[3] === 0x21 && bytes[4] === 0x1a && bytes[5] === 0x07;
}

async function extractZipPages(file: File | Blob): Promise<string[]> {
  const zip = await JSZip.loadAsync(file);
  const entries = Object.keys(zip.files)
    .filter((entryName) => IMAGE_EXTENSIONS.some((ext) => entryName.toLowerCase().endsWith(ext)))
    .filter((entryName) => !zip.files[entryName].dir);

  const sortedEntries = sortNaturally(entries);

  if (sortedEntries.length === 0) {
    throw new Error("El archivo no contiene imagenes legibles.");
  }

  return Promise.all(
    sortedEntries.map(async (entryName) => {
      const blob = await zip.files[entryName].async("blob");
      return fileToDataUrl(blob);
    })
  );
}

function createComicRecord(title: string, pages: string[], source: ComicSource): ComicRecord {
  return {
    id: createId(),
    title,
    source,
    cover: pages[0],
    pages,
    createdAt: new Date().toISOString(),
    progress: { currentPage: 0 }
  };
}

async function canvasToDataUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo convertir una pagina del PDF."));
          return;
        }
        void fileToDataUrl(blob).then(resolve, reject);
      },
      "image/jpeg",
      0.92
    );
  });
}

export async function importImageBatch(files: FileList | File[]): Promise<ComicRecord> {
  const allFiles = Array.from(files);
  const imageFiles = sortNaturally(
    allFiles
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => file.name)
  ).map((name) => allFiles.find((file) => file.name === name)!);

  if (imageFiles.length === 0) {
    throw new Error("Selecciona imagenes validas para crear un comic.");
  }

  const pages = await Promise.all(imageFiles.map((file) => fileToDataUrl(file)));
  const firstName = imageFiles[0].name.split(".")[0] || "Nuevo comic";

  return createComicRecord(firstName, pages, "images");
}

export async function importCbz(file: File): Promise<ComicRecord> {
  const pages = await extractZipPages(file);
  return createComicRecord(file.name.replace(/\.cbz$/i, ""), pages, "cbz");
}

export async function importCbr(file: File): Promise<ComicRecord> {
  const header = await readMagicBytes(file, 8);

  // Muchos ".cbr" que circulan son en realidad ZIP mal renombrados.
  // Los detectamos por firma real y los tratamos como CBZ en vez de fallar.
  if (looksLikeZip(header)) {
    const pages = await extractZipPages(file);
    return createComicRecord(file.name.replace(/\.cbr$/i, ""), pages, "cbz");
  }

  if (!looksLikeRar(header)) {
    throw new Error(
      "El archivo no es un CBR (RAR) ni un ZIP validos. Puede estar corrupto o tener la extension incorrecta."
    );
  }

  const [data, wasmBinary] = await Promise.all([
    file.arrayBuffer(),
    fetch(unrarWasmUrl).then((response) => response.arrayBuffer())
  ]);

  const extractor = await createExtractorFromData({ data, wasmBinary });

  const fileList = extractor.getFileList();
  const imageNames = [...fileList.fileHeaders]
    .filter((header) => !header.flags.directory)
    .map((header) => header.name)
    .filter((name) => IMAGE_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext)));

  if (imageNames.length === 0) {
    throw new Error("El CBR no contiene imagenes legibles.");
  }

  const sortedNames = sortNaturally(imageNames);

  const extracted = extractor.extract({ files: sortedNames });
  const entryByName = new Map(
    [...extracted.files].map((entry) => [entry.fileHeader.name, entry.extraction])
  );

  const pages = await Promise.all(
    sortedNames.map(async (name) => {
      const bytes = entryByName.get(name);
      if (!bytes) {
        throw new Error(`No se pudo extraer la pagina "${name}" del CBR.`);
      }
      return fileToDataUrl(new Blob([new Uint8Array(bytes)]));
    })
  );

  return createComicRecord(file.name.replace(/\.cbr$/i, ""), pages, "cbr");
}

export async function importPdf(file: File): Promise<ComicRecord> {
  const [{ GlobalWorkerOptions, getDocument }, workerModule] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")
  ]);
  GlobalWorkerOptions.workerSrc = workerModule.default;

  const buffer = await file.arrayBuffer();
  const loadingTask = getDocument({ data: buffer });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const maxWidth = 1600;
      const scale = Math.min(2, maxWidth / baseViewport.width);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("No se pudo preparar el render del PDF.");
      }

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      await page.render({
        canvas,
        canvasContext: context,
        viewport
      }).promise;

      pages.push(await canvasToDataUrl(canvas));
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }

  if (pages.length === 0) {
    throw new Error("El PDF no contiene paginas legibles.");
  }

  return createComicRecord(file.name.replace(/\.pdf$/i, ""), pages, "pdf");
}