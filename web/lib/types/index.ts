export type ReactionType    = 'love' | 'follow' | 'view';
export type TargetType      = 'universe' | 'story' | 'page' | 'author';
export type Genre           = 'fantasy' | 'scienceFiction' | 'romance' | 'thriller' |
                              'horror' | 'mystery' | 'adventure' | 'historical' | 'literary' | 'other';
export type StoryStatus     = 'draft' | 'published' | 'completed' | 'abandoned';
export type ContributorRole = 'creator' | 'coAuthor' | 'fanContributor';
// Earned, monotonic progression. Order matters: reader < writer < author < creator
// (mirrors the `author_tier` Postgres enum). See lib/tiers.ts for display metadata.
export type AuthorTier      = 'reader' | 'writer' | 'author' | 'creator';

export const GENRE_LABELS: Record<Genre, string> = {
  fantasy:        'Fantasy',
  scienceFiction: 'Sci-Fi',
  romance:        'Romance',
  thriller:       'Thriller',
  horror:         'Horror',
  mystery:        'Mystery',
  adventure:      'Adventure',
  historical:     'Historical',
  literary:       'Literary',
  other:          'Other',
};

export interface AuthorSummary {
  id:          string;
  displayName: string;
  avatarImage?: string;
  /** Optional on summaries (bylines/contributors) — only populated where the
   *  query joins it; always present on the full Author below. */
  tier?:       AuthorTier;
}

export interface Author extends AuthorSummary {
  bio?:          string;
  followCount:   number;
  loveCount:     number;
  tier:          AuthorTier;
  emailVerified: boolean;
  createdAt:     string;
}

export interface Universe {
  id:          string;
  slug:        string;
  name:        string;
  concept:     string;
  coverImage:  string;
  era?:        string;
  world?:      string;
  genres:      Genre[];
  creator:     AuthorSummary;
  isMature:    boolean;
  loveCount:   number;
  followCount: number;
  viewCount:   number;
  storyCount:  number;
  createdAt:   string;
}

export interface Story {
  id:          string;
  title:       string;
  synopsis:    string;
  coverImage?: string;
  genreTags:   Genre[];
  status:      StoryStatus;
  universe:    Pick<Universe, 'id' | 'slug' | 'name'>;
  contributors: Array<{ author: AuthorSummary; role: ContributorRole }>;
  isMature:    boolean;
  loveCount:   number;
  followCount: number;
  viewCount:   number;
  pageCount:   number;
  createdAt:   string;
}

export interface Page {
  id:                string;
  storyId:           string;
  parentId:          string | null;
  content:           string;
  illustration?:     string;
  disallowNext:      boolean;
  disallowAlternate: boolean;
  author:            AuthorSummary;
  loveCount:         number;
  viewCount:         number;
  children:          Page[];
  createdAt:         string;
}

export interface Character {
  id:          string;
  name:        string;
  image:       string;
  description?: string;
  universeId:  string;
}

// API response wrappers
export interface PaginatedResponse<T> {
  data:    T[];
  page:    number;
  limit:   number;
  total:   number;
  hasMore: boolean;
}

export interface ApiError {
  error: string;
  code:  string;
}

// Form input types
export interface CreateUniverseInput {
  name:       string;
  concept:    string;
  coverImage: string;
  era?:       string;
  world?:     string;
  genres:     Genre[];
  isMature?:  boolean;
}

export interface CreateStoryInput {
  title:       string;
  synopsis:    string;
  universeId:  string;
  genreTags:   Genre[];
  coverImage?: string;
  isMature?:   boolean;
}

export interface CreatePageInput {
  storyId:      string;
  parentId:     string | null;
  content:      string;
  illustration?: string;
}

export interface ReactionInput {
  type:       ReactionType;
  targetType: TargetType;
  targetId:   string;
}
