import {
  ClerkLoaded,
  ClerkLoading,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useAuth,
  useUser,
} from "@clerk/clerk-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  BookmarkPlus,
  Check,
  ExternalLink,
  Folder,
  Loader2,
  Search,
  Star,
  Tags,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { filterBookmarks, summarizeLibrary } from "./lib/bookmarks";
import { initializeProductAnalytics, trackProductEvent } from "./lib/analytics";
import {
  createBookmark,
  createShelfmarkClient,
  ensureUserWorkspace,
  hasSupabaseConfig,
  listBookmarks,
  updateBookmarkFlags,
  type ShelfmarkClient,
} from "./lib/supabase";
import { judgeRequestNotice } from "./content/judge-request";
import { cn } from "./lib/utils";
import type { Bookmark, Collection } from "./lib/types";

type SaveForm = {
  url: string;
  title: string;
  description: string;
  collectionId: string;
  tags: string;
  note: string;
  isFavorite: boolean;
};

const emptyForm: SaveForm = {
  url: "",
  title: "",
  description: "",
  collectionId: "",
  tags: "",
  note: "",
  isFavorite: false,
};

export default function App() {
  const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
  if (!clerkKey) return <SetupScreen missing="Clerk" />;

  return (
    <>
      <ClerkLoading>
        <LoadingScreen />
      </ClerkLoading>
      <ClerkLoaded>
        <SignedOut>
          <MarketingGate />
        </SignedOut>
        <SignedIn>
          <ShelfmarkWorkspace />
        </SignedIn>
      </ClerkLoaded>
    </>
  );
}

function ShelfmarkWorkspace() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const supabaseConfigured = hasSupabaseConfig();
  const [client, setClient] = useState<ShelfmarkClient | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string>("all");
  const [activeTag, setActiveTag] = useState<string>("");
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<SaveForm>(emptyForm);

  useEffect(() => {
    initializeProductAnalytics(
      user
        ? {
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            name: user.fullName ?? undefined,
          }
        : null,
    );
    if (user) trackProductEvent("login_completed", { userId: user.id });
  }, [user]);

  useEffect(() => {
    if (!user || !supabaseConfigured) return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken({ template: "supabase" });
        if (!token) throw new Error("Clerk did not return a Supabase JWT.");
        const nextClient = createShelfmarkClient(token);
        const nextCollections = await ensureUserWorkspace(nextClient, {
          id: user!.id,
          email: user!.primaryEmailAddress?.emailAddress,
          name: user!.fullName ?? undefined,
        });
        const nextBookmarks = await listBookmarks(nextClient, user!.id);
        if (cancelled) return;
        setClient(nextClient);
        setCollections(nextCollections);
        setBookmarks(nextBookmarks);
        setForm((current) => ({ ...current, collectionId: nextCollections[0]?.id ?? "" }));
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Shelfmark could not load.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();

    return () => {
      cancelled = true;
    };
  }, [getToken, supabaseConfigured, user]);

  const summary = useMemo(() => summarizeLibrary(bookmarks), [bookmarks]);
  const visibleBookmarks = useMemo(
    () =>
      filterBookmarks(bookmarks, {
        collectionId: activeCollectionId === "all" ? undefined : activeCollectionId,
        tag: activeTag || undefined,
        query,
        favoritesOnly,
        includeArchived: false,
      }),
    [activeCollectionId, activeTag, bookmarks, favoritesOnly, query],
  );

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!client || !user) return;
    setSaving(true);
    setError(null);
    try {
      const bookmark = await createBookmark(client, {
        userId: user.id,
        ...form,
      });
      setBookmarks((current) => [bookmark, ...current]);
      setForm({ ...emptyForm, collectionId: form.collectionId });
      trackProductEvent("bookmark_created", {
        userId: user.id,
        collectionId: bookmark.collectionId,
        domain: bookmark.domain,
        tagCount: bookmark.tags.length,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Bookmark could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleBookmark(bookmark: Bookmark, key: "isFavorite" | "isArchived") {
    if (!client) return;
    const next = {
      isFavorite: key === "isFavorite" ? !bookmark.isFavorite : bookmark.isFavorite,
      isArchived: key === "isArchived" ? !bookmark.isArchived : bookmark.isArchived,
    };
    const updated = await updateBookmarkFlags(client, bookmark, next);
    setBookmarks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    trackProductEvent(key === "isFavorite" ? "bookmark_favorited" : "bookmark_archived", {
      userId: bookmark.userId,
      domain: bookmark.domain,
    });
  }

  if (!supabaseConfigured) return <SetupScreen missing="Supabase" />;
  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-md bg-primary text-primary-text">
              <BookmarkPlus size={20} />
            </div>
            <div>
              <p className="font-primary text-xl font-medium">Shelfmark</p>
              <p className="font-body text-sm text-muted-foreground">A private library for product evidence.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill label={`${summary.total} saved`} />
            <StatusPill label={`${summary.favorites} starred`} />
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="grid content-start gap-4">
          <Panel title="Collections" icon={<Folder size={17} />}>
            <NavItem active={activeCollectionId === "all"} onClick={() => setActiveCollectionId("all")}>
              All bookmarks
            </NavItem>
            {collections.map((collection) => (
              <NavItem
                key={collection.id}
                active={activeCollectionId === collection.id}
                onClick={() => {
                  setActiveCollectionId(collection.id);
                  trackProductEvent("collection_selected", { userId: user?.id, collectionId: collection.id });
                }}
              >
                {collection.name}
              </NavItem>
            ))}
          </Panel>

          <Panel title="Tags" icon={<Tags size={17} />}>
            <NavItem active={!activeTag} onClick={() => setActiveTag("")}>
              All tags
            </NavItem>
            {summary.tags.map((tag) => (
              <NavItem
                key={tag}
                active={activeTag === tag}
                onClick={() => {
                  setActiveTag(tag);
                  trackProductEvent("tag_filter_applied", { userId: user?.id, tag });
                }}
              >
                #{tag}
              </NavItem>
            ))}
          </Panel>
        </aside>

        <section className="grid gap-6">
          <form onSubmit={handleSave} className="rounded-md border border-border bg-card p-5">
            {judgeRequestNotice.enabled ? (
              <div className="mb-5 rounded-md border border-border bg-muted p-4">
                <p className="font-primary text-sm font-medium">{judgeRequestNotice.title}</p>
                <p className="mt-1 font-body text-sm leading-relaxed text-muted-foreground">{judgeRequestNotice.body}</p>
                <p className="mt-2 font-mono text-xs text-muted-foreground">Updated by {judgeRequestNotice.updatedBy}</p>
              </div>
            ) : null}
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="font-primary text-3xl font-medium leading-tight">Save a useful link</h1>
                <p className="mt-1 max-w-prose font-body text-sm leading-relaxed text-muted-foreground">
                  Capture the source, why it matters, and where it belongs before it disappears into chat history.
                </p>
              </div>
              <button
                className="min-h-11 rounded-md bg-primary px-4 py-2 font-primary text-sm text-primary-text disabled:opacity-60"
                disabled={saving || !form.url.trim() || !form.collectionId}
              >
                {saving ? "Saving..." : "Save bookmark"}
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="URL">
                <input value={form.url} onChange={(event) => setFormValue(setForm, "url", event.target.value)} placeholder="https://example.com" />
              </Field>
              <Field label="Title">
                <input value={form.title} onChange={(event) => setFormValue(setForm, "title", event.target.value)} placeholder="Defaults to domain" />
              </Field>
              <Field label="Collection">
                <select value={form.collectionId} onChange={(event) => setFormValue(setForm, "collectionId", event.target.value)}>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tags">
                <input value={form.tags} onChange={(event) => setFormValue(setForm, "tags", event.target.value)} placeholder="analytics, research" />
              </Field>
              <Field label="Description">
                <input value={form.description} onChange={(event) => setFormValue(setForm, "description", event.target.value)} placeholder="Short context" />
              </Field>
              <Field label="Note">
                <input value={form.note} onChange={(event) => setFormValue(setForm, "note", event.target.value)} placeholder="Why this is worth saving" />
              </Field>
            </div>
            <label className="mt-4 flex min-h-11 items-center gap-2 font-body text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={form.isFavorite}
                onChange={(event) => setFormValue(setForm, "isFavorite", event.target.checked)}
              />
              Star this bookmark
            </label>
            {error ? <p className="mt-4 rounded-md border border-border bg-muted p-3 font-body text-sm text-muted-foreground">{error}</p> : null}
          </form>

          <div className="rounded-md border border-border bg-card p-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <label className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-background px-3">
                <Search size={17} className="text-muted-foreground" />
                <input
                  className="w-full bg-transparent text-sm outline-none"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    if (event.target.value.trim().length > 2) {
                      trackProductEvent("search_submitted", { userId: user?.id, queryLength: event.target.value.trim().length });
                    }
                  }}
                  placeholder="Search titles, domains, notes, tags"
                />
              </label>
              <button
                className={cn(
                  "min-h-11 rounded-md border border-border px-3 font-primary text-sm",
                  favoritesOnly ? "bg-primary text-primary-text" : "bg-background text-foreground",
                )}
                onClick={() => setFavoritesOnly((current) => !current)}
              >
                Favorites
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            <AnimatePresence>
              {visibleBookmarks.map((bookmark) => (
                <motion.article
                  key={bookmark.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-md border border-border bg-card p-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {bookmark.faviconUrl ? <img className="size-5" src={bookmark.faviconUrl} alt="" /> : null}
                        <p className="font-primary text-lg font-medium">{bookmark.title}</p>
                      </div>
                      <p className="mt-1 font-body text-sm text-muted-foreground">{bookmark.description || bookmark.domain}</p>
                      <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{bookmark.url}</p>
                      {bookmark.note ? <p className="mt-3 rounded-md bg-muted p-3 font-body text-sm text-muted-foreground">{bookmark.note}</p> : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {bookmark.tags.map((tag) => (
                          <span key={tag} className="rounded-md bg-muted px-2 py-1 font-primary text-xs text-muted-foreground">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <IconButton label="Favorite" active={bookmark.isFavorite} onClick={() => void toggleBookmark(bookmark, "isFavorite")}>
                        <Star size={17} />
                      </IconButton>
                      <IconButton label="Archive" onClick={() => void toggleBookmark(bookmark, "isArchived")}>
                        <Archive size={17} />
                      </IconButton>
                      <a
                        className="grid size-11 place-items-center rounded-md border border-border bg-background text-foreground hover:bg-muted"
                        href={bookmark.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Open ${bookmark.title}`}
                      >
                        <ExternalLink size={17} />
                      </a>
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
            {visibleBookmarks.length === 0 ? (
              <div className="rounded-md border border-dashed border-border bg-card p-8 text-center">
                <div className="mx-auto grid size-12 place-items-center rounded-md bg-muted text-muted-foreground">
                  <Check size={20} />
                </div>
                <p className="mt-4 font-primary text-lg font-medium">No matching bookmarks</p>
                <p className="mt-1 font-body text-sm text-muted-foreground">Save a link or loosen the current filters.</p>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}

function MarketingGate() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-12">
      <section className="w-full max-w-4xl">
        <div className="mb-8 inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 font-primary text-sm text-muted-foreground">
          <BookmarkPlus size={16} />
          Shelfmark
        </div>
        <h1 className="max-w-3xl font-primary text-5xl font-medium leading-tight md:text-7xl">
          Save the product evidence you will need later.
        </h1>
        <p className="mt-5 max-w-prose font-body text-base leading-relaxed text-muted-foreground">
          Shelfmark is a focused bookmark workspace for product teams collecting research, analytics references, launch notes,
          and customer evidence.
        </p>
        <div className="mt-8">
          <SignInButton mode="modal">
            <button className="min-h-12 rounded-md bg-primary px-5 py-3 font-primary text-sm text-primary-text">Sign in to Shelfmark</button>
          </SignInButton>
        </div>
      </section>
    </main>
  );
}

function SetupScreen({ missing }: { missing: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <section className="max-w-xl rounded-md border border-border bg-card p-6">
        <p className="font-primary text-xl font-medium">{missing} configuration required</p>
        <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">
          Shelfmark is a real authenticated product. Add the required environment variables before public deployment.
        </p>
      </section>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-background">
      <Loader2 className="animate-spin text-muted-foreground" size={28} />
    </main>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 font-primary text-sm font-medium">
        {icon}
        {title}
      </div>
      <div className="grid gap-1">{children}</div>
    </div>
  );
}

function NavItem({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className={cn(
        "min-h-10 rounded-md px-3 py-2 text-left font-primary text-sm transition-colors",
        active ? "bg-primary text-primary-text" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <label className="grid gap-1">
      <span className="font-primary text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function StatusPill({ label }: { label: string }) {
  return <span className="rounded-md border border-border bg-background px-3 py-2 font-primary text-xs text-muted-foreground">{label}</span>;
}

function IconButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={cn(
        "grid size-11 place-items-center rounded-md border border-border bg-background text-foreground hover:bg-muted",
        active && "bg-primary text-primary-text",
      )}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function setFormValue<K extends keyof SaveForm>(
  setForm: React.Dispatch<React.SetStateAction<SaveForm>>,
  key: K,
  value: SaveForm[K],
) {
  setForm((current) => ({ ...current, [key]: value }));
}
