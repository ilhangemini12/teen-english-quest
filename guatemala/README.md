# Guatemala Citizenship Trainer

Standalone study app under the existing BatumHub GitHub Pages repository.

## Purpose
- Spanish practice aimed at a practical naturalization interview/exam context
- 12-week curriculum
- spaced-repetition vocabulary
- Guatemala civics/history/geography quizzes
- speaking prompts with browser audio recording / speech recognition where supported
- Busuu + Drops study logging
- local-first storage with optional Supabase sync through `guatemala_progress`

## Deployment
Static files only. GitHub Pages serves the folder directly at `/teen-english-quest/guatemala/`.

## Data model
Authenticated users sync to `public.guatemala_progress` with RLS restricting rows to `auth.uid() = user_id`.

## Important
The civics questions are study material, not an official Guatemalan naturalization question bank. Sources are linked in the app.
