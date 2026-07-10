export interface NotificationPrefs {
  comments: boolean;
  collab: boolean;
  mentions: boolean;
  announcements: boolean;
  weekly: boolean;
  important: boolean;
  public_profile: boolean;
  show_online: boolean;
}

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  headline: string;
  bio: string | null;
  avatar_url: string | null;
  phone?: string | null;
  is_online: boolean;
  created_at: string;
  notification_prefs?: Partial<NotificationPrefs>;
}

/** Public subset of a user (author, actor, conversation partner). */
export interface PublicUser {
  id: number;
  username: string;
  full_name: string;
  headline: string;
  bio: string | null;
  avatar_url: string | null;
  is_online: boolean;
}

export interface Comment {
  id: number;
  body: string;
  created_at: string;
  author: PublicUser;
}

export interface Notification {
  id: number;
  type: "comment" | "upvote" | "collab" | "mention" | "system";
  text: string;
  read: boolean;
  created_at: string;
  idea_id: number | null;
  actor: PublicUser | null;
}

export interface CollaborationRequest {
  id: number;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  idea_id: number | null;
  from_user: PublicUser;
  to_user: PublicUser;
  conversation_id?: number | null;
}

export interface Conversation {
  id: number;
  other_user: PublicUser;
  last_message: string | null;
  last_time: string | null;
  unread: number;
}

export interface Message {
  id: number;
  body: string;
  sender_id: number;
  read: boolean;
  created_at: string;
}

export interface SearchResults {
  ideas: Idea[];
  users: PublicUser[];
}

export interface UserUpdate {
  full_name?: string;
  headline?: string;
  bio?: string | null;
  avatar_url?: string | null;
  email?: string;
  phone?: string | null;
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
