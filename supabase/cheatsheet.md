# Supabase CLI Cheat Sheet (with pnpm)

## 1. Initialize Supabase in your project
```
pnpm supabase init
```
Creates the `supabase/` directory and config files. Run once per project.

---

## 2. Link your local project to your Supabase project
```
pnpm supabase link --project-ref <your-project-ref>
```
Links your local project to your remote Supabase project. Only needs to be done once per project.

---

## 3. Create a new migration
```
pnpm supabase migration new <migration_name>
```
Creates a new migration SQL file in `supabase/migrations/`.
Example:
```
pnpm supabase migration new add_profile_trigger
```

---

## 4. Edit the migration file
Open the new file in `supabase/migrations/` and add your SQL changes.

---

## 5. Push migrations to your remote Supabase project
```
pnpm supabase db push
```
Applies all new migrations to your remote Supabase database.

---

## 6. (Optional) Start a local Supabase dev environment
```
pnpm supabase start
```
Runs a local Supabase stack (Postgres, Auth, Storage, etc.) for local development.

---

## 7. (Optional) Reset your local dev database
```
pnpm supabase db reset
```
Resets and reapplies all migrations to your local dev database.

---

## 8. Get help
```
pnpm supabase --help
```
Shows all available commands and options.

---

## Notes
- Your `<your-project-ref>` can be found in your Supabase dashboard URL or in Project Settings > General.
- The database password is **not** your anon key. Find it in Project Settings > Database > Connection Info > Password.
- Always review your migration files before pushing to production. 