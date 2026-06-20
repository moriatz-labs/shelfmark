import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildBookmarkDraft } from "./bookmarks";
import type { Bookmark, BookmarkDraftInput, Collection } from "./types";

type ShelfmarkDatabase = {
  public: {
    Tables: {
      profiles: {
        Row: {
          clerk_user_id: string;
          email: string | null;
          name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          clerk_user_id: string;
          email?: string | null;
          name?: string | null;
        };
        Update: {
          email?: string | null;
          name?: string | null;
          updated_at?: string;
        };
      };
      collections: {
        Row: {
          id: string;
          clerk_user_id: string;
          name: string;
          description: string | null;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          name: string;
          description?: string | null;
          color?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          color?: string;
          updated_at?: string;
        };
      };
      bookmarks: {
        Row: {
          id: string;
          clerk_user_id: string;
          collection_id: string;
          url: string;
          title: string;
          description: string | null;
          domain: string;
          favicon_url: string | null;
          tags: string[];
          note: string | null;
          is_favorite: boolean;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          collection_id: string;
          url: string;
          title: string;
          description?: string | null;
          domain: string;
          favicon_url?: string | null;
          tags?: string[];
          note?: string | null;
          is_favorite?: boolean;
          is_archived?: boolean;
        };
        Update: {
          collection_id?: string;
          title?: string;
          description?: string | null;
          tags?: string[];
          note?: string | null;
          is_favorite?: boolean;
          is_archived?: boolean;
          updated_at?: string;
        };
      };
    };
  };
};

export type ShelfmarkClient = SupabaseClient;

export function hasSupabaseConfig() {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export function createShelfmarkClient(token: string): ShelfmarkClient {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured.");
  }

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export async function ensureUserWorkspace(
  client: ShelfmarkClient,
  profile: { id: string; email?: string; name?: string },
): Promise<Collection[]> {
  await client.from("profiles").upsert({
    clerk_user_id: profile.id,
    email: profile.email ?? null,
    name: profile.name ?? null,
  });

  const existing = await client
    .from("collections")
    .select("*")
    .eq("clerk_user_id", profile.id)
    .order("created_at", { ascending: true });
  if (existing.error) throw existing.error;

  if ((existing.data ?? []).length > 0) {
    return existing.data.map(mapCollection);
  }

  const inserted = await client
    .from("collections")
    .insert([
      {
        clerk_user_id: profile.id,
        name: "Product signals",
        description: "Market, analytics, and customer evidence worth revisiting.",
        color: "graphite",
      },
      {
        clerk_user_id: profile.id,
        name: "Reading queue",
        description: "Longer articles and references saved for later.",
        color: "slate",
      },
    ])
    .select("*")
    .order("created_at", { ascending: true });
  if (inserted.error) throw inserted.error;
  return (inserted.data ?? []).map(mapCollection);
}

export async function listBookmarks(client: ShelfmarkClient, userId: string): Promise<Bookmark[]> {
  const response = await client
    .from("bookmarks")
    .select("*")
    .eq("clerk_user_id", userId)
    .order("created_at", { ascending: false });
  if (response.error) throw response.error;
  return (response.data ?? []).map(mapBookmark);
}

export async function createBookmark(client: ShelfmarkClient, input: BookmarkDraftInput): Promise<Bookmark> {
  const draft = buildBookmarkDraft(input);
  const response = await client
    .from("bookmarks")
    .insert({
      clerk_user_id: draft.userId,
      collection_id: draft.collectionId,
      url: draft.url,
      title: draft.title,
      description: draft.description,
      domain: draft.domain,
      favicon_url: draft.faviconUrl,
      tags: draft.tags,
      note: draft.note,
      is_favorite: draft.isFavorite,
      is_archived: draft.isArchived,
    })
    .select("*")
    .single();
  if (response.error) throw response.error;
  return mapBookmark(response.data);
}

export async function updateBookmarkFlags(
  client: ShelfmarkClient,
  bookmark: Bookmark,
  flags: Pick<Bookmark, "isFavorite" | "isArchived">,
): Promise<Bookmark> {
  const response = await client
    .from("bookmarks")
    .update({
      is_favorite: flags.isFavorite,
      is_archived: flags.isArchived,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookmark.id)
    .select("*")
    .single();
  if (response.error) throw response.error;
  return mapBookmark(response.data);
}

function mapCollection(row: ShelfmarkDatabase["public"]["Tables"]["collections"]["Row"]): Collection {
  return {
    id: row.id,
    userId: row.clerk_user_id,
    name: row.name,
    description: row.description ?? "",
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBookmark(row: ShelfmarkDatabase["public"]["Tables"]["bookmarks"]["Row"]): Bookmark {
  return {
    id: row.id,
    userId: row.clerk_user_id,
    collectionId: row.collection_id,
    url: row.url,
    title: row.title,
    description: row.description ?? "",
    domain: row.domain,
    faviconUrl: row.favicon_url ?? "",
    tags: row.tags ?? [],
    note: row.note ?? "",
    isFavorite: row.is_favorite,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
