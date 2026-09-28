# Supabase activation for Teen English Quest

The front end is already wired for Supabase. The remaining activation is:

1. Create/select a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor (or apply it as a migration).
3. In Authentication → URL Configuration:
   - Site URL: `https://ilhangemini12.github.io/teen-english-quest/`
   - Add the same URL to Redirect URLs.
4. In Authentication → Providers → Email:
   - Enable Email + Password.
   - Keep email confirmation enabled for real users.
5. Copy only the **Project URL** and **publishable/anon key** into `supabase/config.js`.
   - The publishable/anon key is intended for browser apps.
   - NEVER commit a `service_role` key.
6. Reload the GitHub Pages site and test:
   - Create account
   - Confirm email
   - Sign in
   - Copy invite code
   - Add a second test account by invite code
   - Accept the friend request
   - Complete a mission on each account
   - Verify Friends League ranking updates

## Privacy model

- No public user directory.
- No public leaderboard.
- No direct messages or chat.
- No location field.
- Friends connect only by private invite code.
- Email is used for authentication only; friends see only the chosen nickname.
- XP writes go through database functions with duplicate and daily-cap rules.
