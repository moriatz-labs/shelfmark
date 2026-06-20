export type Collection = {
  id: string;
  userId: string;
  name: string;
  description: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

export type Bookmark = {
  id: string;
  userId: string;
  collectionId: string;
  url: string;
  title: string;
  description: string;
  domain: string;
  faviconUrl: string;
  tags: string[];
  note: string;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BookmarkDraftInput = {
  userId: string;
  collectionId: string;
  url: string;
  title: string;
  description: string;
  tags: string;
  note: string;
  isFavorite?: boolean;
};

export type BookmarkFilters = {
  collectionId?: string;
  query?: string;
  tag?: string;
  favoritesOnly?: boolean;
  includeArchived?: boolean;
};

export type LibrarySummary = {
  total: number;
  favorites: number;
  archived: number;
  tags: string[];
};
