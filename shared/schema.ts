import { pgTable, text, integer, boolean, index, timestamp, serial, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  email: text("email").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Session storage table for PostgreSQL-based session management
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const weeks = pgTable("weeks", {
  id: serial("id").primaryKey(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  title: text("title").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
});

export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  weekId: integer("week_id").references(() => weeks.id),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  submitter: text("submitter").notNull(),
  fingerprint: text("fingerprint").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  status: text("status").default("pending").notNull(),
  stars: integer("stars").default(0).notNull(),
  featuredAt: timestamp("featured_at"),
}, (table) => ({
  weekIdIdx: index("topics_week_id_idx").on(table.weekId),
  statusIdx: index("topics_status_idx").on(table.status),
  createdAtIdx: index("topics_created_at_idx").on(table.createdAt),
  weekStatusIdx: index("topics_week_status_idx").on(table.weekId, table.status),
  featuredAtIdx: index("topics_featured_at_idx").on(table.featuredAt),
  urlIdx: index("topics_url_idx").on(table.url),
  weekCreatedIdx: index("topics_week_created_idx").on(table.weekId, table.createdAt),
}));

export const stars = pgTable("stars", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").references(() => topics.id).notNull(),
  fingerprint: text("fingerprint").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  topicIdIdx: index("stars_topic_id_idx").on(table.topicId),
  fingerprintIdx: index("stars_fingerprint_idx").on(table.fingerprint),
  topicFingerprintIdx: index("stars_topic_fingerprint_idx").on(table.topicId, table.fingerprint),
  createdAtIdx: index("stars_created_at_idx").on(table.createdAt),
}));

export const shares = pgTable("shares", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").references(() => topics.id).notNull(),
  fingerprint: text("fingerprint").notNull(),
  platform: text("platform").default("x").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  topicIdIdx: index("shares_topic_id_idx").on(table.topicId),
  fingerprintIdx: index("shares_fingerprint_idx").on(table.fingerprint),
  topicFingerprintIdx: index("shares_topic_fingerprint_idx").on(table.topicId, table.fingerprint),
  createdAtIdx: index("shares_created_at_idx").on(table.createdAt),
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

export const insertShareSchema = createInsertSchema(shares).pick({
  topicId: true,
  fingerprint: true,
  platform: true,
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

export type Share = typeof shares.$inferSelect;
export type InsertShare = z.infer<typeof insertShareSchema>;

// Comment types removed

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

// Comment submission schema removed

// Extended types for API responses
export type TopicWithCommentsAndStars = Topic & {
  starsCount: number;
  sharesCount?: number;
  hasStarred?: boolean;
  hasShared?: boolean;
};

export type WeekWithTopics = Week & {
  topics: TopicWithCommentsAndStars[];
};
