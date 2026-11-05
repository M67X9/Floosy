# Floosy database

Floosy stores expenses in a Supabase (Postgres) project named **Floosy**. People register and sign in with their email (Supabase Auth), and every expense belongs to one user. Two tables and one storage bucket: `"Expenses"` (the data) and `"Expenses_History"` (an automatic log of edits and deletes), and the `Invoices` bucket (invoice photos). Name, income and the monthly budget are saved in the user's account (`user_metadata.floosy`) and cached on the device; language and theme stay on the device.

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
| `image` | `text` | no | – | Path of the invoice photo in the `Invoices` storage bucket, e.g. `<user id>/1793719006681-k3j9x2ab.jpg`. Null when there is no photo |
| `user_id` | `uuid` | no | `auth.uid()` | The owner (`auth.users.id`, `on delete cascade`). Filled in automatically on insert. Null only on rows from before sign-in existed: nobody can see those through the app |
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
| `user_id` | `uuid` | Owner of the expense (copied from `"Expenses"`) |
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

**Uploads go through an edge function.** The app does not write to the bucket. It posts the photo bytes to the `upload-invoice` edge function (`supabase/functions/upload-invoice/index.ts`), which checks the caller's access token (401 if nobody is signed in), checks the type (jpeg, png, webp, heic, heif) and size (10 MB), uploads with the service role into the caller's own folder, `<user id>/<timestamp>-<random>.<ext>`, and returns the path. The function is deployed with `verify_jwt` off (the publishable key `sb_publishable_...` is not a JWT) and verifies the user's token itself with `auth.getUser`.

**Autofill from the invoice.** In the add sheet, "Autofill from the invoice" sends a photo to the `read-invoice` edge function (`supabase/functions/read-invoice/index.ts`). It also requires a signed-in user (401 otherwise). The function asks a free vision model on OpenRouter (default `google/gemma-4-31b-it:free`, with two free fallbacks) for the total, date, category and merchant, validates the answer, and returns `{ amount, date, category, description }` with `null` for anything it could not read. The app fills only those fields and the user reviews before saving. Amounts printed in a currency other than KWD are returned as `null`. Nothing is stored by the function. Setup: add the secret `OPENROUTER_API_KEY` (Supabase dashboard > Edge Functions > Secrets); optionally `OPENROUTER_MODELS` (comma-separated model ids) because free models come and go. Without the key the function answers 503 and the app shows a "couldn't read" message.

Storage policy on `storage.objects` (role `authenticated`): `users view own invoices`, **select only**, where the bucket is `Invoices` and the first folder of the path is the user's id. That is what lets the app create signed links for a user's own photos and nobody else's. There are no write policies; only the edge function writes. Photos uploaded before sign-in existed sit at the bucket root and are not viewable through the app.

## Accounts and access rules (row-level security)

- **Sign-up and sign-in:** email + password through Supabase Auth (`supabase.auth.signUp` / `signInWithPassword`), screen in `src/components/Auth.tsx`, session handling in `src/lib/auth.tsx`. The session is stored with AsyncStorage, so users stay signed in.
- **Email confirmation:** with "Confirm email" on (the Supabase default) a new user has no session until they open the link in the email, so the app shows "Check your email". Set **Authentication > URL Configuration > Site URL** to the deployed web address (e.g. `https://floosy-six.vercel.app`) and add any other web addresses (e.g. `http://localhost:8081`) to the redirect URLs, otherwise the link points at the wrong place. The built-in email sender is rate limited (a few emails per hour); add custom SMTP before real users sign up.
- **Policies on `public."Expenses"`** (role `authenticated`, all conditioned on `user_id = auth.uid()`): `users read own expenses`, `users add own expenses`, `users edit own expenses`, `users delete own expenses`. The `anon` role (signed-out visitors) has no access to the table at all.
- **Existing rows from before sign-in** have `user_id` null and are invisible to everyone. To give them to a user once they have registered:

```sql
update public."Expenses" set user_id = (select id from auth.users where email = '<their email>') where user_id is null;
```

  (Their old invoice photos are at the bucket root, so they will not display; the files are still there.)
- **Reset app** deletes only the signed-in user's expenses (the policies limit it), then clears their name, income and budget.
- **Password rules** (set in Authentication > Sign In / Providers > Email, enforced by Supabase): at least 8 characters, with a lowercase letter, an uppercase letter and a digit. The sign-up form (`passwordRules` in `src/components/Auth.tsx`) shows a live checklist and must be kept in step with the dashboard. Leaked-password protection needs the Pro plan.
- Not built yet: password reset ("forgot password") and deleting an account.

## How the app connects

- `src/lib/supabase.ts` creates the Supabase client from two environment variables and keeps the sign-in session in AsyncStorage.
- `src/lib/auth.tsx` holds the signed-in user (`useAuth`: `signIn`, `signUp`, `signOut`). `src/app/_layout.tsx` shows the sign-in screen until there is a user.
- `src/lib/expenses.ts` maps rows to the app's `Tx` type and does the reads and writes (fetch all, insert, update, delete, delete all), plus `uploadInvoice` (calls the `upload-invoice` edge function) and `invoiceUrl` for the `Invoices` bucket.
- `src/components/Invoice.tsx` holds the photo picker (`expo-image-picker`), the photo preview and the full-screen viewer.
- `src/lib/store.tsx` loads the signed-in user's expenses, keeps a local cache per user id so the app opens with data before the network answers (language and theme are cached separately, per device), and returns `false`/`null` from add, edit, delete and reset when the database can't be reached, so the screens can show an error.
- The time of an expense is not sent on insert: the database fills in the current Kuwait time. Editing an expense keeps its original time.
- The app's single `description` is stored once; it is shown in both English and Arabic.
- **Reset app** (Settings) deletes the signed-in user's rows in `Expenses`, then clears their profile and budgets.

### Environment variables

Create `.env.local` in the project root (git ignores it):

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<publishable key, sb_publishable_...>
```

Find both in the Supabase dashboard under Project Settings. Restart Expo with `npx expo start --clear` after changing them.

Use only the **publishable** (or legacy `anon`) key. Anything starting with `EXPO_PUBLIC_` is bundled into the app and readable by anyone who has it. Never put the `service_role` or secret key here.
