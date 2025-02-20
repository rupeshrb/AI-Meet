import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const meetings = pgTable("meetings", {
  id: text("id").primaryKey(),
  password: text("password").notNull(),
  hostId: text("host_id").notNull(),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

export const participants = pgTable("participants", {
  id: text("id").primaryKey(),
  meetingId: text("meeting_id").references(() => meetings.id),
  name: text("name").notNull(),
  isHost: boolean("is_host").default(false)
});

export const insertMeetingSchema = createInsertSchema(meetings).pick({
  id: true,
  password: true,
  hostId: true
});

export const insertParticipantSchema = createInsertSchema(participants).pick({
  id: true,
  meetingId: true,
  name: true,
  isHost: true
});

export const joinMeetingSchema = z.object({
  meetingId: z.string(),
  password: z.string(),
  name: z.string().min(1)
});

export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type InsertParticipant = z.infer<typeof insertParticipantSchema>;
export type Meeting = typeof meetings.$inferSelect;
export type Participant = typeof participants.$inferSelect;
