import type { Bookmark, BookmarkDraftInput, BookmarkFilters, LibrarySummary } from "./types";

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (/^[a-z][a-z\d+\-.]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    throw new Error("Only HTTP and HTTPS URLs can be saved.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error("Enter a valid URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs can be saved.");
  }

  return parsed.toString();
}

export function normalizeTags(input: string): string[] {
  const seen = new Set<string>();
  for (const rawTag of input.split(",")) {
    const tag = rawTag
      .trim()
      .replace(/^#+/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (tag) seen.add(tag);
  }
  return [...seen].sort();
}

export function buildBookmarkDraft(input: BookmarkDraftInput): Omit<Bookmark, "id" | "createdAt" | "updatedAt"> {
  const url = normalizeUrl(input.url);
  const parsed = new URL(url);
  const domain = parsed.hostname.replace(/^www\./, "");

  return {
    userId: input.userId,
    collectionId: input.collectionId,
    url,
    title: input.title.trim() || domain,
    description: input.description.trim(),
    domain,
    faviconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    tags: normalizeTags(input.tags),
    note: input.note.trim(),
    isFavorite: Boolean(input.isFavorite),
    isArchived: false,
  };
}

export function filterBookmarks(bookmarks: Bookmark[], filters: BookmarkFilters): Bookmark[] {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const tag = filters.tag?.trim().toLowerCase() ?? "";

  return bookmarks.filter((bookmark) => {
    if (!filters.includeArchived && bookmark.isArchived) return false;
    if (filters.collectionId && bookmark.collectionId !== filters.collectionId) return false;
    if (filters.favoritesOnly && !bookmark.isFavorite) return false;
    if (tag && !bookmark.tags.includes(tag)) return false;
    if (!query) return true;

    const haystack = [
      bookmark.title,
      bookmark.url,
      bookmark.description,
      bookmark.domain,
      bookmark.note,
      bookmark.tags.join(" "),
    ].join(" ").toLowerCase();

    return haystack.includes(query);
  });
}

export function summarizeLibrary(bookmarks: Bookmark[]): LibrarySummary {
  const tags = new Set<string>();
  let favorites = 0;
  let archived = 0;

  for (const bookmark of bookmarks) {
    if (bookmark.isFavorite) favorites += 1;
    if (bookmark.isArchived) archived += 1;
    for (const tag of bookmark.tags) tags.add(tag);
  }

  return {
    total: bookmarks.length,
    favorites,
    archived,
    tags: [...tags].sort(),
  };
}
