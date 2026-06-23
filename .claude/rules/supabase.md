# Supabase Architecture Rules
1. Security: All tables MUST have Row Level Security (RLS) enabled.
   - Student: can only update own profile and portfolio.
   - Employer: can only manage own internships and update application status.
   - College Admin: read-only access to students where `college_name` matches their institution.
2. Typing: Always use `supabase gen types typescript` and import types from `types/supabase.ts`. Do not manually create TS interfaces for DB rows.
3. Telegram Notifications: Implement via Supabase Database Webhooks + Edge Functions triggering on `applications` table inserts.