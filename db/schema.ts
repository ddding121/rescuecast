import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const feedback = sqliteTable("feedback", {
  userId: text("user_id").primaryKey(),
  value: text("value", { enum: ["helpful", "unhelpful"] }).notNull(),
  createdAt: integer("created_at").notNull(),
});

export const sceneImages = sqliteTable("scene_images", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  objectKey: text("object_key").notNull(),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  uniqueIndex("idx_scene_images_object_key").on(table.objectKey),
]);
