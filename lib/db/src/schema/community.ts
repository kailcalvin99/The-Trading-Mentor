import { pgTable, serial, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const communityPostsTable = pgTable("community_posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  category: text("category").notNull().default("strategy-talk"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  likeCount: integer("like_count").notNull().default(0),
  replyCount: integer("reply_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const communityRepliesTable = pgTable("community_replies", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => communityPostsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const postLikesTable = pgTable("post_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => communityPostsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("post_likes_post_user_idx").on(table.postId, table.userId),
]);

export const communitySubscriptionsTable = pgTable("community_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("community_subscriptions_user_cat_idx").on(table.userId, table.category),
]);

export type CommunityPost = typeof communityPostsTable.$inferSelect;
export type CommunityReply = typeof communityRepliesTable.$inferSelect;
