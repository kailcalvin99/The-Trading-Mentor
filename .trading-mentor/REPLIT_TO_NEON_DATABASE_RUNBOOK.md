# Replit Production Database to Neon Runbook

## Purpose

Move The Trading Mentor's current Replit Production Database to an Alex-owned Neon Postgres project later, safely and without data loss.

This is a runbook only. Do not run this migration until Alex confirms the source production database URL is available, the target Neon database exists, and a staging window is approved.

## Current Understanding

- The app reads its database connection from `process.env.DATABASE_URL`.
- Replit Production Database appears to provide `DATABASE_URL` to the published app environment.
- Replit Production Database is PostgreSQL and is likely Neon-backed but Replit-managed.
- The target database should be an Alex-owned Neon Postgres project.
- Drizzle schema exists in `lib/db`, but production migration should use `pg_dump` and `pg_restore` so data, sequences, constraints, and production reality are preserved.

## Hard Warnings

Do not:

- Print or paste database URLs into chat, logs, screenshots, docs, or commits.
- Change DNS.
- Shut down Replit.
- Remove Replit files.
- Change Stripe.
- Point the production API to Neon until restore validation passes.
- Run schema-changing commands against production during this migration.
- Use `pnpm --filter @workspace/db push` as the primary production migration method.
- Touch mobile.

## Required Tools

Install or verify:

```bash
pg_dump --version
```

```bash
pg_restore --version
```

```bash
psql --version
```

Use a `pg_dump` client version equal to or newer than the Replit production Postgres major version when possible. If `pg_dump` reports a server/client version mismatch, stop and install a newer PostgreSQL client before retrying.

## Secret Handling

Use environment variables only:

- `DATABASE_URL`: source Replit Production Database URL.
- `NEON_DATABASE_URL`: target Alex-owned Neon database URL.

Do not echo these values.

Safe presence checks:

```bash
test -n "$DATABASE_URL" && echo "DATABASE_URL is set"
```

```bash
test -n "$NEON_DATABASE_URL" && echo "NEON_DATABASE_URL is set"
```

Unsafe commands:

```bash
echo "$DATABASE_URL"
```

```bash
echo "$NEON_DATABASE_URL"
```

## Pre-Migration Checklist

1. Confirm Replit live app is healthy.
2. Confirm Alex can access the Replit Production Database connection URL.
3. Confirm Alex has created an Alex-owned Neon Postgres project.
4. Confirm `DATABASE_URL` is set only in the local migration shell and points to Replit Production Database.
5. Confirm `NEON_DATABASE_URL` is set only in the local migration shell and points to the target Neon database.
6. Confirm the target Neon database is empty or disposable.
7. Confirm no DNS changes are planned.
8. Confirm Replit will remain live after the migration test.
9. Confirm Stripe will not be changed during database migration.
10. Confirm a short write-free staging window if real users can write to production data.
11. Confirm a local folder outside the repo for dump files.

Recommended local dump folder:

```bash
mkdir -p ~/Documents/TradingMentorDatabaseBackups
```

Then run the dump from that folder, not from inside the repo.

## Source Database Identification

Source is expected to be Replit Production Database.

Check only metadata, not secret values:

```bash
psql "$DATABASE_URL" -c "select current_database() as db, current_user as user, version();"
```

If this command fails, stop. Do not guess the URL or provider.

## Backup Command

Run from a folder outside the repo:

```bash
pg_dump -Fc "$DATABASE_URL" --no-owner --no-privileges -f trading-mentor-production.dump
```

After the dump:

```bash
ls -lh trading-mentor-production.dump
```

Optional integrity check:

```bash
pg_restore --list trading-mentor-production.dump > trading-mentor-production.dump.list
```

Do not commit the dump or dump list.

## Restore Command

Restore into the target Neon database:

```bash
pg_restore --clean --if-exists --single-transaction --no-owner --no-privileges --exit-on-error -d "$NEON_DATABASE_URL" trading-mentor-production.dump
```

If restore fails:

1. Stop immediately.
2. Save the exact error text.
3. Do not retry with destructive changes unless the target Neon database is confirmed disposable.
4. Do not touch Replit Production Database.

## Validation Queries

Run validation against both source and target, then compare results.

Source:

```bash
psql "$DATABASE_URL"
```

Target:

```bash
psql "$NEON_DATABASE_URL"
```

### Table List

```sql
select table_schema, table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

### Row Counts

Use conditional queries so validation does not fail if an optional table is absent.

```sql
select 'users' as table_name, count(*) as row_count from users
union all
select 'user_subscriptions', count(*) from user_subscriptions
union all
select 'trades', count(*) from trades
union all
select 'beta_feedback_logs', count(*) from beta_feedback_logs;
```

`verification_tokens` is not currently visible in the committed Drizzle schema, but check it if production contains it:

```sql
select to_regclass('public.verification_tokens') as verification_tokens_table;
```

If present:

```sql
select 'verification_tokens' as table_name, count(*) as row_count
from verification_tokens;
```

### Sequence Sanity Checks

List serial/identity-backed sequences:

```sql
select sequence_schema, sequence_name
from information_schema.sequences
where sequence_schema = 'public'
order by sequence_name;
```

Check key table sequence alignment:

```sql
select
  'users' as table_name,
  max(id) as max_id,
  nextval(pg_get_serial_sequence('users', 'id')) as next_sequence_value
from users;
```

```sql
select
  'trades' as table_name,
  max(id) as max_id,
  nextval(pg_get_serial_sequence('trades', 'id')) as next_sequence_value
from trades;
```

If `next_sequence_value` is less than or equal to `max_id`, stop and repair the target sequence before using the target database.

Repair pattern, target Neon only:

```sql
select setval(pg_get_serial_sequence('users', 'id'), coalesce((select max(id) from users), 1), true);
```

```sql
select setval(pg_get_serial_sequence('trades', 'id'), coalesce((select max(id) from trades), 1), true);
```

## Drizzle Schema Check

The current Drizzle schema can help recreate the database structure, but it is not the safest primary production migration method.

Known note:

- `beta_feedback_logs` exists in current Drizzle schema.
- It is owned by committed Drizzle migrations; API startup does not create migrated tables.
- A full production dump/restore should preserve whether it exists in production and any rows already stored.

After restore, use Drizzle only to compare or manage future migrations. Do not run `pnpm --filter @workspace/db push` against production until the migration plan explicitly approves it.

## Staging-First Plan

1. Export Replit Production Database to `trading-mentor-production.dump`.
2. Restore into a target Neon staging branch or staging database.
3. Point only the staging API to `NEON_DATABASE_URL`.
4. Keep Replit production API and live domain unchanged.
5. Run API health check.
6. Run login/signup smoke tests with staging-only data expectations.
7. Validate Smart Journal trade reads/writes.
8. Validate admin/user/subscription table reads.
9. Validate Gemini separately using direct Google Gemini env vars.
10. Do not change production API until staging validation passes.

## Cutover Checklist

Only after staging restore and smoke tests pass:

1. Schedule a production write-free window.
2. Pause user writes if possible.
3. Take a fresh Replit Production Database dump.
4. Restore fresh dump into Alex-owned Neon production database.
5. Run validation queries against source and target.
6. Confirm source and target row counts match.
7. Confirm sequences are sane.
8. Update staging/production API environment to use the Alex-owned Neon URL only after validation.
9. Smoke test the replacement API directly.
10. Keep Replit live as rollback.

Do not update DNS during this database migration step. DNS cutover is a later, separate migration task.

## Rollback Plan

Before DNS cutover:

- Rollback is simple: keep the live Replit app pointing at its existing Replit Production Database.
- If Neon restore fails, discard the target Neon database or branch and keep using Replit.
- If staging API fails with Neon, point staging API back to the previous staging database or stop staging.
- Do not modify Replit Production Database as part of rollback.

After future production API cutover, but before DNS changes:

- Restore the previous API environment variable value from the host secret manager.
- Restart the replacement API.
- If replacement API remains unhealthy, keep Replit live and do not proceed.

## Gemini Migration Note

Replit AI/Gemini integration values are separate from database migration.

When the API runs outside Replit, the Replit ModelFarm or Replit AI Integration URL likely must be replaced with:

```bash
AI_INTEGRATIONS_GEMINI_BASE_URL=https://generativelanguage.googleapis.com
```

and an Alex-controlled Google Gemini API key.

Do not mix Gemini migration with the database dump/restore. Validate Gemini after database staging is healthy.

## Exact Next Action

Alex confirms:

1. Access to the source Replit Production Database `DATABASE_URL`.
2. An Alex-owned target Neon Postgres database exists.
3. A staging migration window is acceptable.

Then run the migration in a staging window using this runbook.
