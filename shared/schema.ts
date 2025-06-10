import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: integer("is_admin", { mode: "boolean" }).default(false).notNull(),
  email: text("email").unique(),
  createdAt: text("created_at").notNull(),
});

export const weeks = sqliteTable("weeks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  title: text("title").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(false).notNull(),
});

export const topics = sqliteTable("topics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  id: integer("id").primaryKey({ autoIncrement: true }),
  topicId: integer("topic_id").references(() => topics.id).notNull(),
  fingerprint: text("fingerprint").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  topicIdIdx: index("stars_topic_id_idx").on(table.topicId),
  fingerprintIdx: index("stars_fingerprint_idx").on(table.fingerprint),
  topicFingerprintIdx: index("stars_topic_fingerprint_idx").on(table.topicId, table.fingerprint),
}));

// Comments functionality removed

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  isAdmin: true,
});

export const insertWeekSchema = createInsertSchema(weeks).pick({
  startDate: true,
  endDate: true,
  title: true,
  isActive: true,
});

export const insertTopicSchema = createInsertSchema(topics).pick({
  weekId: true,
  title: true,
  url: true,
  description: true,
  submitter: true,
  status: true,
  fingerprint: true,
});

export const insertStarSchema = createInsertSchema(stars).pick({
  topicId: true,
  fingerprint: true,
});

// Comment schema removed

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

// Extended schemas for form validation
export const submitTopicSchema = insertTopicSchema.omit({ weekId: true, status: true, fingerprint: true }).extend({
  description: z.string().optional(),
});

// Server-side topic creation schema (includes all required fields)
export const createTopicSchema = insertTopicSchema.extend({
  fingerprint: z.string(),
  status: z.string().default('pending'),
});

export type CreateTopicData = z.infer<typeof createTopicSchema>;

export const submitCommentSchema = insertCommentSchema.omit({ topicId: true });

// Extended types for API responses
export type TopicWithCommentsAndStars = Topic & {
  comments: Comment[];
  starsCount: number;
  hasStarred?: boolean;
};

export type WeekWithTopics = Week & {
  topics: TopicWithCommentsAndStars[];
};
