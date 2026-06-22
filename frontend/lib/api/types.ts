export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  headline: string;
  bio: string | null;
  avatar_url: string | null;
  is_online: boolean;
  created_at: string;
}

export interface Idea {
  id: number;
  title: string;
  body: string;
  category: string;
  visibility: string;
  created_at: string;
  author: User;
  upvote_count: number;
  comment_count: number;
  saved_by_me: boolean;
  upvoted_by_me: boolean;
}

export interface IdeaListResponse {
  items: Idea[];
  total: number;
  page: number;
  page_size: number;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
