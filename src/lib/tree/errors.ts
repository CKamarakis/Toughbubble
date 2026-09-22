import { UnauthenticatedError } from "@/db/client";

export const NOT_FOUND = "That item is no longer available. Reload to see the latest.";

// Messages for the tree rules the database enforces (drizzle/0003) and the
// same-owner foreign key (drizzle/0000).
const CONSTRAINT_MESSAGES: Record<string, string> = {
  items_parent_is_container: "Only projects and folders can contain items.",
  items_no_cycles: "An item can't be moved inside itself.",
  items_active_parent: "That destination is no longer available. Reload to see the latest.",
  items_parent_same_owner_fk: "That destination no longer exists. Reload to see the latest.",
};

/** A user-facing message for an error thrown by a tree operation. */
export function treeErrorMessage(error: unknown): string {
  if (error instanceof UnauthenticatedError) return "Your session has ended. Please sign in again.";
  const cause = (error as { cause?: unknown })?.cause ?? error;
  const constraint = (cause as { constraint_name?: string })?.constraint_name;
  if (constraint && CONSTRAINT_MESSAGES[constraint]) return CONSTRAINT_MESSAGES[constraint];
  console.error("[tree] unexpected error", {
    code: (cause as { code?: string })?.code,
    message: (cause as { message?: string })?.message,
  });
  return "Something went wrong. Please try again.";
}
