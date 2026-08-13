export type ComicSource = "cbz" | "images" | "pdf";

export interface ReaderProgress {
  currentPage: number;
  lastOpenedAt?: string;
}

export interface ComicRecord {
  id: string;
  title: string;
  subtitle?: string;
  source: ComicSource;
  cover: string;
  pages: string[];
  createdAt: string;
  progress: ReaderProgress;
}
