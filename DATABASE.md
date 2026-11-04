# Floosy database

Floosy stores expenses in a Supabase (Postgres) project named **Floosy**. Two tables and one storage bucket: `"Expenses"` (the data) and `"Expenses_History"` (an automatic log of edits and deletes), and the `Invoices` bucket (invoice photos). Everything else (name, income, budgets, language, theme) stays on the device.

## Table: `public."Expenses"`

The table name has a capital E, so raw SQL must quote it: `public."Expenses"`. In the app it is `supabase.from('Expenses')`.

| Column | Type | Required | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | yes | `gen_random_uuid()` | Primary key |
| `amount_kwd` | `numeric(10,3)` | yes | – | Amount in Kuwaiti dinar, 3 decimals (fils). Must be greater than 0 |
| `expense_date` | `date` | yes | today, Kuwait time | Date of the expense |
| `expense_time` | `time` | yes | now, Kuwait time | Time of the expense, to the second |
| `category` | `text` | yes | – | One of: `food`, `ent`, `subs`, `loan`, `fuel`, `shop`, `trans`, `bills`, `health`, `other` |
| `description` | `text` | no | – | Free text, optional |
| `image` | `text` | no | – | Path of the invoice photo in the `Invoices` storage bucket, e.g. `1793719006681-k3j9x2ab.jpg`. Null when there is no photo |
| `created_at` | `timestamptz` | yes | `now()` | When the row was created |

Constraints: `amount_kwd > 0`, and `category` must be one of the ten values above (check constraint).

Index: `expenses_expense_date_idx` on `(expense_date desc, expense_time desc)`, used to list the newest expenses first.

### Categories

| `category` | Name |
|---|---|
| `food` | Food & Drinks |
| `ent` | Entertainment |
| `subs` | Subscriptions |
| `loan` | Loan |
| `fuel` | Gas / Fuel |
| `shop` | Shopping |
| `trans` | Transportation |
| `bills` | Bills & Utilities |
| `health` | Health |
| `other` | Other |

### Create statement

```sql
create table public."Expenses" (
  id uuid primary key default gen_random_uuid(),
  amount_kwd numeric(10, 3) not null check (amount_kwd > 0),
  expense_date date not null default (now() at time zone 'Asia/Kuwait')::date,
  expense_time time without time zone not null default (now() at time zone 'Asia/Kuwait')::time(0),
  category text not null check (category in ('food', 'ent', 'subs', 'loan', 'fuel', 'shop', 'trans', 'bills', 'health', 'other')),
  description text,
  created_at timestamptz not null default now()
);

create index expenses_expense_date_idx on public."Expenses" (expense_date desc, expense_time desc);

alter table public."Expenses" enable row level security;
```

## Table: `public."Expenses_History"`

An audit log of edited and deleted expenses. **Nothing in the app writes to it**: a database trigger (`expenses_log_changes`, function `log_expense_change`) on `"Expenses"` adds a row after every edit or delete, however it was made (app, dashboard or SQL).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key of the log row |
| `expense_id` | `uuid` | Id of the expense in `"Expenses"`. No foreign key, because deleted expenses no longer exist there |
| `action` | `text` | `edited` or `deleted` |
| `note` | `text` | `Edited` or `Deleted` |
| `action_at` | `timestamptz` | When it happened (UTC) |
| `action_at_kuwait` | `timestamp` | The same moment in Kuwait time |
| `amount_kwd`, `expense_date`, `expense_time`, `category`, `description`, `image` | as in `"Expenses"` | The expense's values after an edit, or the values it had when it was deleted |
| `original_created_at` | `timestamptz` | When the expense was first created |
| `changes` | `jsonb` | Edits only: each changed field with its `before` and `after`. Null for deletes |

Example `changes` value:

```json
{ "amount_kwd": { "before": 1.25, "after": 2 }, "category": { "before": "food", "after": "shop" } }
```

Behaviour:

- Saving an expense without changing anything is not logged.
- Only changes made from now on are recorded; earlier edits and deletes were not.
- **Reset app** deletes every expense, so it logs one `deleted` row per expense.
- The trigger function is `security definer` and cannot be called through the API (execute is revoked from `public`, `anon` and `authenticated`).
- Row-level security is on with **no policies**, so the app's public key cannot read, change or erase the log. Read it in the Supabase dashboard (Table Editor or SQL Editor) or with the service role.

Read the history of one expense:

```sql
select action, note, action_at_kuwait, amount_kwd, category, description, changes
from public."Expenses_History"
where expense_id = '<expense id>'
order by action_at;
```

## Storage bucket: `Invoices`

Invoice photos live in a **private** Supabase Storage bucket named `Invoices` (file limit 10 MB; allowed types `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`). Each expense can have one photo; its path in the bucket is saved in `"Expenses".image`.

How the app uses it:

- **Adding a photo:** in the add or edit sheet, "Take photo" (camera, phone only) or "Choose photo" (library). The app re-encodes the photo as JPEG at quality 0.7 to keep uploads small, uploads it to the bucket under a unique name (`<timestamp>-<random>.jpg`), and then saves that path in `image`.
- **Viewing:** because the bucket is private, the app asks Supabase for a signed link that expires after one hour, and shows the photo in the expense details (tap it for a full-screen view). Expenses that have a photo show a small photo icon in the lists.
- **Replacing or removing:** only changes the `image` column. **The app never deletes files from the bucket**, so `Expenses_History` can still point at the earlier photo (the history's `changes` shows the old and new path), and a deleted expense keeps its photo. Files are only removed by hand in the dashboard.
- **Reset app** deletes the expenses but leaves the photos in the bucket.

**Uploads go through an edge function.** The app does not write to the bucket with its public key. It posts the photo bytes to the `upload-invoice` edge function (`supabase/functions/upload-invoice/index.ts`), which checks the type (jpeg, png, webp, heic, heif) and size (10 MB), uploads with the service role under a unique name, and returns the path. The function is deployed with `verify_jwt` off, because the publishable key (`sb_publishable_...`) is not a JWT; it does no caller check yet, so anyone who knows its URL can upload images (never read, replace or delete them). Add sign-in and verify the user's JWT in the function when auth arrives.

**Autofill from the invoice.** In the add sheet, once a new photo is picked, "Autofill from the invoice" sends it to the `read-invoice` edge function (`supabase/functions/read-invoice/index.ts`). The function asks a free vision model on OpenRouter (default `google/gemma-4-31b-it:free`, with two free fallbacks) for the total, date, category and merchant, validates the answer, and returns `{ amount, date, category, description }` with `null` for anything it could not read. The app fills only those fields and the user reviews before saving. Amounts printed in a currency other than KWD are returned as `null`. Nothing is stored by the function. Setup: add the secret `OPENROUTER_API_KEY` (Supabase dashboard > Edge Functions > Secrets); optionally `OPENROUTER_MODELS` (comma-separated model ids) because free models come and go. Without the key the function answers 503 and the app shows a "couldn't read" message. Like `upload-invoice` it has `verify_jwt` off, so anyone with its URL can spend the free quota until sign-in is added.

Storage policies on `storage.objects` for the `anon` role: **view only** (temporary test policy `testing: anon can view invoices`, needed for signed links). The anon upload, replace and delete policies were removed. As with the table, viewing is only safe for a single-user test: anyone with the public key can list and read invoices. Replace it with per-user rules (for example a folder per user, `(storage.foldername(name))[1] = auth.uid()::text`) when sign-in is added.

## Access rules (row-level security)

Row-level security is on. Right now there are four **temporary test policies**, one each for read, add, edit and delete, granted to the `anon` role (the app's public key) with no conditions:

```sql
create policy "testing: anon can read expenses" on public."Expenses" for select to anon using (true);
create policy "testing: anon can add expenses" on public."Expenses" for insert to anon with check (true);
create policy "testing: anon can edit expenses" on public."Expenses" for update to anon using (true) with check (true);
create policy "testing: anon can delete expenses" on public."Expenses" for delete to anon using (true);
```

**This is only safe for a single-user test.** The app has no sign-in, and the public key is bundled inside the app, so anyone who obtains the app can read, change or delete every expense. Before sharing the app or publishing the web version:

1. Add sign-in (Supabase Auth).
2. Add a `user_id uuid references auth.users (id) default auth.uid()` column.
3. Replace the four policies with per-user ones, e.g. `using (user_id = auth.uid())`, granted to `authenticated`.

## How the app connects

- `src/lib/supabase.ts` creates the Supabase client from two environment variables.
- `src/lib/expenses.ts` maps rows to the app's `Tx` type and does the reads and writes (fetch all, insert, update, delete, delete all), plus `uploadInvoice` (calls the `upload-invoice` edge function) and `invoiceUrl` for the `Invoices` bucket.
- `src/components/Invoice.tsx` holds the photo picker (`expo-image-picker`), the photo preview and the full-screen viewer.
- `src/lib/store.tsx` loads expenses on start, keeps a local cache so the app opens with data before the network answers, and returns `false`/`null` from add, edit, delete and reset when the database can't be reached, so the screens can show an error.
- The time of an expense is not sent on insert: the database fills in the current Kuwait time. Editing an expense keeps its original time.
- The app's single `description` is stored once; it is shown in both English and Arabic.
- **Reset app** (Settings) deletes every row in `Expenses`, then clears the local profile and budgets.

### Environment variables

Create `.env.local` in the project root (git ignores it):

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<publishable key, sb_publishable_...>
```

Find both in the Supabase dashboard under Project Settings. Restart Expo with `npx expo start --clear` after changing them.

Use only the **publishable** (or legacy `anon`) key. Anything starting with `EXPO_PUBLIC_` is bundled into the app and readable by anyone who has it. Never put the `service_role` or secret key here.
