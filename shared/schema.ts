import { pgTable, text, integer, boolean, index, timestamp, serial, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(), // Replit user ID (string)
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
}));

// Comments functionality removed

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
  isAdmin: true,
});

export const upsertUserSchema = insertUserSchema.omit({ isAdmin: true });

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
export type UpsertUser = z.infer<typeof upsertUserSchema>;

export type Week = typeof weeks.$inferSelect;
export type InsertWeek = z.infer<typeof insertWeekSchema>;

export type Topic = typeof topics.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;

export type Star = typeof stars.$inferSelect;
export type InsertStar = z.infer<typeof insertStarSchema>;

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
  hasStarred?: boolean;
};

export type WeekWithTopics = Week & {
  topics: TopicWithCommentsAndStars[];
};
