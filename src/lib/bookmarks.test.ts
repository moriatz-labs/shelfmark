import { describe, expect, it } from "vitest";
import {
  buildBookmarkDraft,
  filterBookmarks,
  normalizeTags,
  normalizeUrl,
  summarizeLibrary,
} from "./bookmarks";
import type { Bookmark } from "./types";

const bookmarks: Bookmark[] = [
  {
    id: "b_1",
    userId: "user_1",
    collectionId: "c_product",
    url: "https://www.pendo.io/pendo-blog/introducing-novus/",
    title: "Introducing Novus",
    description: "Product intelligence for teams shipping faster.",
    domain: "pendo.io",
    faviconUrl: "https://www.google.com/s2/favicons?domain=pendo.io&sz=64",
    tags: ["analytics", "ai"],
    note: "Relevant for instrumentation.",
    isFavorite: true,
    isArchived: false,
    createdAt: "2026-06-20T00:00:00.000Z",
    updatedAt: "2026-06-20T00:00:00.000Z",
  },
  {
    id: "b_2",
    userId: "user_1",
    collectionId: "c_research",
    url: "https://raindrop.io/",
    title: "Raindrop",
    description: "Bookmark manager reference.",
    domain: "raindrop.io",
    faviconUrl: "https://www.google.com/s2/favicons?domain=raindrop.io&sz=64",
    tags: ["bookmarks", "research"],
    note: "",
    isFavorite: false,
    isArchived: false,
    createdAt: "2026-06-20T00:00:00.000Z",
    updatedAt: "2026-06-20T00:00:00.000Z",
  },
];

describe("bookmark helpers", () => {
  it("normalizes URLs and rejects unsupported protocols", () => {
    expect(normalizeUrl("raindrop.io/features")).toBe("https://raindrop.io/features");
    expect(normalizeUrl(" https://example.com/path#section ")).toBe("https://example.com/path#section");
    expect(() => normalizeUrl("javascript:alert(1)")).toThrow("Only HTTP and HTTPS URLs can be saved.");
  });

  it("normalizes comma and hash separated tags", () => {
    expect(normalizeTags(" AI, product analytics, #AI,  research ")).toEqual([
      "ai",
      "product-analytics",
      "research",
    ]);
  });

  it("builds a bookmark draft with URL metadata fallbacks", () => {
    const draft = buildBookmarkDraft({
      userId: "user_1",
      collectionId: "c_research",
      url: "shelfmark.app/blog/post",
      title: "",
      description: "",
      tags: "Research, save later",
      note: "Review for demo.",
    });

    expect(draft).toEqual(
      expect.objectContaining({
        url: "https://shelfmark.app/blog/post",
        title: "shelfmark.app",
        domain: "shelfmark.app",
        faviconUrl: "https://www.google.com/s2/favicons?domain=shelfmark.app&sz=64",
        tags: ["research", "save-later"],
      }),
    );
  });

  it("filters by collection, tag, search query, favorites, and archive state", () => {
    const result = filterBookmarks(bookmarks, {
      collectionId: "c_product",
      tag: "analytics",
      query: "novus",
      favoritesOnly: true,
      includeArchived: false,
    });

    expect(result.map((bookmark) => bookmark.id)).toEqual(["b_1"]);
  });

  it("summarizes the visible library", () => {
    expect(summarizeLibrary(bookmarks)).toEqual({
      total: 2,
      favorites: 1,
      archived: 0,
      tags: ["ai", "analytics", "bookmarks", "research"],
    });
  });
});
