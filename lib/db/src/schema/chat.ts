import { pgTable, serial, text, integer, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const chatChannelEnum = pgEnum("chat_channel", ["public", "private"]);
export const senderRoleEnum = pgEnum("sender_role", ["admin", "customer"]);

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  channel: chatChannelEnum("channel").notNull(),
  senderId: integer("sender_id").notNull().references(() => usersTable.id),
  senderRole: senderRoleEnum("sender_role").notNull(),
  recipientId: integer("recipient_id").references(() => usersTable.id),
  content: text("content"),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatReactionsTable = pgTable("chat_reactions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => chatMessagesTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [unique().on(t.messageId, t.userId)]);

export type ChatMessage = typeof chatMessagesTable.$inferSelect;
export type ChatReaction = typeof chatReactionsTable.$inferSelect;
