import { eq } from "drizzle-orm";
import { authUsers } from "drizzle-orm/supabase";
import { describe, expect, it } from "vitest";
import { createTestUser, deleteTestUser, withAdminDb } from "./harness";

describe("integration harness", () => {
  it("creates and removes a test user cleanly", async () => {
    const user = await createTestUser();
    const exists = () =>
      withAdminDb((db) => db.select({ id: authUsers.id }).from(authUsers).where(eq(authUsers.id, user.id)));

    expect(await exists()).toHaveLength(1);
    await deleteTestUser(user);
    expect(await exists()).toHaveLength(0);
  });
});
