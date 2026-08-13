import { useEffect, useMemo, useState } from "react";
import { deleteComic, getAllComics, saveComic } from "../lib/comicStorage";
import type { ComicRecord } from "../types";

const starterComics: ComicRecord[] = [
  {
    id: "starter-1",
    title: "Demo Reader",
    subtitle: "Importa tus propios archivos para sustituirlo",
    source: "images",
    cover:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900"><rect width="600" height="900" fill="#1b2635"/><rect x="40" y="40" width="520" height="820" rx="32" fill="#c85a27"/><text x="300" y="410" text-anchor="middle" fill="#fff4ea" font-family="Arial" font-size="52" font-weight="700">Lector</text><text x="300" y="475" text-anchor="middle" fill="#fff4ea" font-family="Arial" font-size="52" font-weight="700">Comics</text><text x="300" y="560" text-anchor="middle" fill="#ffe0cf" font-family="Arial" font-size="24">Importa un CBZ o varias imagenes</text></svg>`),
    pages: [
      "data:image/svg+xml;utf8," +
        encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1800"><rect width="1200" height="1800" fill="#121212"/><rect x="80" y="80" width="1040" height="1640" rx="36" fill="#f3ebde"/><text x="600" y="400" text-anchor="middle" fill="#c85a27" font-family="Arial" font-size="88" font-weight="700">Bienvenido</text><text x="600" y="530" text-anchor="middle" fill="#1b2635" font-family="Arial" font-size="42">Esta PWA se instala desde Safari</text><text x="600" y="620" text-anchor="middle" fill="#1b2635" font-family="Arial" font-size="42">y guarda comics en el navegador.</text><text x="600" y="980" text-anchor="middle" fill="#5c5148" font-family="Arial" font-size="34">Pulsa Importar para cargar un CBZ</text><text x="600" y="1040" text-anchor="middle" fill="#5c5148" font-family="Arial" font-size="34">o una secuencia de imagenes.</text></svg>`)
    ],
    createdAt: new Date().toISOString(),
    progress: { currentPage: 0 }
  }
];

export function useLibrary() {
  const [comics, setComics] = useState<ComicRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const stored = await getAllComics();
      setComics(stored.length > 0 ? stored : starterComics);
      setIsLoading(false);
    })();
  }, []);

  const continueReading = useMemo(() => {
    return comics
      .filter((comic) => comic.progress.currentPage > 0)
      .sort((a, b) => {
        return (
          new Date(b.progress.lastOpenedAt ?? 0).getTime() -
          new Date(a.progress.lastOpenedAt ?? 0).getTime()
        );
      })[0];
  }, [comics]);

  async function upsertComic(comic: ComicRecord) {
    await saveComic(comic);
    setComics((current) => {
      const withoutOld = current.filter((item) => item.id !== comic.id && !item.id.startsWith("starter-"));
      return [comic, ...withoutOld];
    });
  }

  async function updateProgress(comicId: string, currentPage: number) {
    const comic = comics.find((entry) => entry.id === comicId);
    if (!comic) return;

    const updated = {
      ...comic,
      progress: {
        currentPage,
        lastOpenedAt: new Date().toISOString()
      }
    };

    await saveComic(updated);
    setComics((current) => current.map((entry) => (entry.id === comicId ? updated : entry)));
  }

  async function removeComic(comicId: string) {
    await deleteComic(comicId);
    setComics((current) => current.filter((entry) => entry.id !== comicId));
  }

  return {
    comics,
    isLoading,
    continueReading,
    upsertComic,
    updateProgress,
    removeComic
  };
}
