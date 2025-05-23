import { pgTable, text, serial, integer, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  email: text("email").unique(),
});

export const weeks = pgTable("weeks", {
  id: serial("id").primaryKey(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  title: text("title").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
});

export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  weekId: integer("week_id").references(() => weeks.id),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description").notNull(),
  submitter: text("submitter").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  status: text("status").default("pending").notNull(), // pending, approved, featured, rejected
  stars: integer("stars").default(0).notNull(),
});

export const stars = pgTable("stars", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").references(() => topics.id).notNull(),
  fingerprint: text("fingerprint").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").references(() => topics.id).notNull(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
});

export const insertStarSchema = createInsertSchema(stars).pick({
  topicId: true,
  fingerprint: true,
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  topicId: true,
  name: true,
  content: true,
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

// Extended schemas for form validation
export const submitTopicSchema = insertTopicSchema.omit({ weekId: true, status: true });
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
