import type { ObjectId } from "mongodb";

export const EXPLORE_POST_TYPES = [
  "update",
  "opportunity",
  "featured_school",
  "deadline",
  "flyer",
  "sponsored",
] as const;

export type ExplorePostType = (typeof EXPLORE_POST_TYPES)[number];

export type ExploreMedia = {
  type: "image" | "video";
  url: string;
};

export type ExploreFeaturedSchool = {
  id: string;
  name: string;
  slug: string | null;
  logoSrc: string | null;
  deadline: string | null;
};

export type ExplorePostDoc = {
  _id?: ObjectId;
  authorName: string;
  authorAvatar?: string | null;
  authorType: "admin" | "partner" | "sponsored";
  schoolId?: ObjectId | null;
  postType: ExplorePostType;
  body: string;
  media: ExploreMedia[];
  featuredSchool?: ExploreFeaturedSchool | null;
  isSponsored: boolean;
  status: "Draft" | "Published";
  likes: string[];
  likeCount: number;
  commentCount: number;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date | null;
};

export type ExploreCommentDoc = {
  _id?: ObjectId;
  postId: ObjectId;
  userEmail: string;
  userName: string;
  userAvatar: string;
  text: string;
  likes: string[];
  createdAt: Date;
};

export function serializeExplorePost(
  doc: ExplorePostDoc,
  viewerEmail?: string | null,
) {
  const id = doc._id ? String(doc._id) : "";
  const likes = Array.isArray(doc.likes) ? doc.likes : [];
  return {
    id,
    authorName: doc.authorName,
    authorAvatar: doc.authorAvatar ?? null,
    authorType: doc.authorType,
    schoolId: doc.schoolId ? String(doc.schoolId) : null,
    postType: doc.postType,
    body: doc.body,
    media: Array.isArray(doc.media) ? doc.media : [],
    featuredSchool: doc.featuredSchool ?? null,
    isSponsored: doc.isSponsored === true,
    status: doc.status,
    likeCount: typeof doc.likeCount === "number" ? doc.likeCount : likes.length,
    commentCount: doc.commentCount ?? 0,
    viewCount: doc.viewCount ?? 0,
    likedByMe: viewerEmail
      ? likes.includes(viewerEmail.trim().toLowerCase())
      : false,
    createdAt: doc.createdAt?.toISOString?.() ?? new Date().toISOString(),
    publishedAt: doc.publishedAt?.toISOString?.() ?? null,
    updatedAt: doc.updatedAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

export function postTypeLabel(type: ExplorePostType): string {
  switch (type) {
    case "opportunity":
      return "Opportunity";
    case "featured_school":
      return "Featured school";
    case "deadline":
      return "Deadline";
    case "flyer":
      return "Flyer";
    case "sponsored":
      return "Sponsored";
    default:
      return "Update";
  }
}
