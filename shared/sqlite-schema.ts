import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: integer("is_admin", { mode: 'boolean' }).default(false).notNull(),
  email: text("email").unique(),
  createdAt: text("created_at").notNull(),
});

export const weeks = sqliteTable("weeks", {
  id: integer("id").primaryKey(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  title: text("title").notNull(),
  isActive: integer("is_active", { mode: 'boolean' }).default(false).notNull(),
});

export const topics = sqliteTable("topics", {
  id: integer("id").primaryKey(),
  weekId: integer("week_id").references(() => weeks.id),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  submitter: text("submitter").notNull(),
  fingerprint: text("fingerprint").notNull(),
  createdAt: text("created_at").notNull(),
  status: text("status").default("pending").notNull(),
  stars: integer("stars").default(0).notNull(),
  featuredAt: text("featured_at"),
}, (table) => ({
  weekIdIdx: index("topics_week_id_idx").on(table.weekId),
  statusIdx: index("topics_status_idx").on(table.status),
  createdAtIdx: index("topics_created_at_idx").on(table.createdAt),
  weekStatusIdx: index("topics_week_status_idx").on(table.weekId, table.status),
  featuredAtIdx: index("topics_featured_at_idx").on(table.featuredAt),
}));

export const stars = sqliteTable("stars", {
  id: integer("id").primaryKey(),
  topicId: integer("topic_id").references(() => topics.id).notNull(),
  fingerprint: text("fingerprint").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  topicIdIdx: index("stars_topic_id_idx").on(table.topicId),
  fingerprintIdx: index("stars_fingerprint_idx").on(table.fingerprint),
  topicFingerprintIdx: index("stars_topic_fingerprint_idx").on(table.topicId, table.fingerprint),
}));

export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey(),
  topicId: integer("topic_id").references(() => topics.id).notNull(),
  commenter: text("commenter").notNull(),
  fingerprint: text("fingerprint").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  topicIdIdx: index("comments_topic_id_idx").on(table.topicId),
  createdAtIdx: index("comments_created_at_idx").on(table.createdAt),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertWeekSchema = createInsertSchema(weeks).omit({
  id: true,
});

export const insertTopicSchema = createInsertSchema(topics).omit({
  id: true,
  createdAt: true,
  status: true,
  stars: true,
  featuredAt: true,
});

export const insertStarSchema = createInsertSchema(stars).omit({
  id: true,
  createdAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Week = typeof weeks.$inferSelect;
export type InsertWeek = z.infer<typeof insertWeekSchema>;

export type Topic = typeof topics.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;

export type Star = typeof stars.$inferSelect;
export type InsertStar = z.infer<typeof insertStarSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export const submitTopicSchema = insertTopicSchema.extend({
  weekId: z.number().optional(),
});

export const submitCommentSchema = insertCommentSchema;

export type TopicWithCommentsAndStars = Topic & {
  comments: Comment[];
  starsCount: number;
  hasStarred?: boolean;
};

export type WeekWithTopics = Week & {
  topics: TopicWithCommentsAndStars[];
};