## How it works, roughly
Accounts are handled by Supabase Auth, the same system the database uses to tell users apart. For now emails go through Supabase's built-in sender: it only delivers to the project team's addresses, sends a few emails per hour, and its links only work in the browser that started sign-up or reset. Custom email (SMTP) is needed before inviting other people.

## Why

- **Email and password sign-up**: Email and password is the only method because Google sign-in was deferred to a later change. The password rules live in Supabase's settings, and the app checks the same rules first so it can say what is missing. [[supabase-auth]]
- **Email and password sign-in**: A wrong password and an unknown email get the same message, so nobody can use the sign-in form to find out who has an account. The sign-up and reset messages follow the same rule.
- **Email confirmation**: The default email links come back through Supabase and only work in the browser that started the flow. This was accepted until custom email is set up. [[supabase-auth]]
- **Protected routes**: After sign-in the app only returns you to pages on its own site, so a crafted link can't send you to another site.
- **Sign-out**: Workspace pages tell the browser not to cache them, so pressing Back after signing out can't show your data again.
