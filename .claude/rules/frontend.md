# Frontend (Next.js & UI) Rules
- Use Server Components by default. Add `"use client"` ONLY when using hooks (useState, React Hook Form) or interactivity.
- Forms MUST use React Hook Form wrapped with Zod for validation.
- Do not write custom CSS. Use Tailwind utility classes and shadcn/ui components exclusively.
- For data fetching from Supabase on the client, use TanStack Query to manage loading/error states.