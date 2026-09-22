import { sql } from "drizzle-orm";
import {
  customType,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { authUid, authUsers, authenticatedRole } from "drizzle-orm/supabase";

export const itemKind = pgEnum("item_kind", ["project", "folder", "note", "storm"]);
export const itemStatus = pgEnum("item_status", ["active", "archived", "trashed"]);

// Fractional-indexing keys compare by byte order. The "C" collation makes
// ORDER BY position agree with the library; a locale collation would not.
const byteOrderText = customType<{ data: string }>({
  dataType: () => 'text COLLATE "C"',
});

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

// Every row belongs to the signed-in user. The default fills it in, and the
// policies below reject any other value, so app code never sets it.
const ownerId = () =>
  uuid("owner_id")
    .notNull()
    .default(sql`auth.uid()`)
    .references(() => authUsers.id, { onDelete: "cascade" });

const ownerOnlyPolicies = (table: string) => {
  const isOwner = sql`owner_id = ${authUid}`;
  return [
    pgPolicy(`${table}_select_own`, { for: "select", to: authenticatedRole, using: isOwner }),
    pgPolicy(`${table}_insert_own`, { for: "insert", to: authenticatedRole, withCheck: isOwner }),
    pgPolicy(`${table}_update_own`, {
      for: "update",
      to: authenticatedRole,
      using: isOwner,
      withCheck: isOwner,
    }),
    pgPolicy(`${table}_delete_own`, { for: "delete", to: authenticatedRole, using: isOwner }),
  ];
};

export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: ownerId(),
    parentId: uuid("parent_id"),
    kind: itemKind("kind").notNull(),
    title: text("title").notNull().default(""),
    // Unused since the sidebar order became fixed (kind groups, newest first).
    // Kept so a manual-order option can reuse it; defaults so inserts skip it.
    position: byteOrderText("position").notNull().default("a0"),
    status: itemStatus("status").notNull().default("active"),
    // Item whose archive/trash action set this status; used to restore a whole
    // subtree together. Not a foreign key: that item may be purged first.
    statusRootId: uuid("status_root_id"),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true }),
    // Project metadata (kind = 'project').
    icon: text("icon"),
    color: text("color"),
    projectStatus: text("project_status"),
    // Last user edit (rename, restyle, convert, move, content save). Set
    // explicitly by those actions; unlike updated_at, archive/trash/restore
    // leave it alone.
    editedAt: timestamp("edited_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    unique("items_id_owner_unique").on(t.id, t.ownerId),
    // Composite FK: the parent must have the same owner. A null parent skips it.
    foreignKey({
      name: "items_parent_same_owner_fk",
      columns: [t.parentId, t.ownerId],
      foreignColumns: [t.id, t.ownerId],
    }).onDelete("cascade"),
    index("items_owner_parent_position_idx").on(t.ownerId, t.parentId, t.position),
    index("items_owner_status_idx").on(t.ownerId, t.status),
    index("items_status_root_idx").on(t.statusRootId),
    ...ownerOnlyPolicies("items"),
  ],
).enableRLS();

export const itemContent = pgTable(
  "item_content",
  {
    itemId: uuid("item_id").primaryKey(),
    ownerId: ownerId(),
    body: jsonb("body").notNull(),
    // Incremented on each save; a save based on an older version is a conflict.
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    foreignKey({
      name: "item_content_item_same_owner_fk",
      columns: [t.itemId, t.ownerId],
      foreignColumns: [items.id, items.ownerId],
    }).onDelete("cascade"),
    ...ownerOnlyPolicies("item_content"),
  ],
).enableRLS();

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type ItemContent = typeof itemContent.$inferSelect;
