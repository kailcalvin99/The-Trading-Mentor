CREATE TABLE IF NOT EXISTS "beta_feedback_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"submitter_role" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"rating" integer NOT NULL,
	"page_context" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
DECLARE
  actual_columns text[];
BEGIN
  SELECT array_agg(
    column_name || ':' || data_type || ':' || is_nullable
    ORDER BY ordinal_position
  )
  INTO actual_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'beta_feedback_logs';

  IF actual_columns IS DISTINCT FROM ARRAY[
    'id:integer:NO',
    'user_id:integer:YES',
    'submitter_role:text:NO',
    'category:text:NO',
    'description:text:NO',
    'rating:integer:NO',
    'page_context:text:YES',
    'created_at:timestamp without time zone:NO'
  ] THEN
    RAISE EXCEPTION 'Existing beta_feedback_logs table does not match the supported legacy contract';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'beta_feedback_logs'
      AND c.contype = 'p'
      AND pg_get_constraintdef(c.oid) = 'PRIMARY KEY (id)'
  ) THEN
    RAISE EXCEPTION 'Existing beta_feedback_logs table is missing the required primary key';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'beta_feedback_logs'
      AND column_name = 'id'
      AND column_default LIKE 'nextval(%beta_feedback_logs_id_seq%'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'beta_feedback_logs'
      AND column_name = 'created_at'
      AND column_default = 'now()'
  ) THEN
    RAISE EXCEPTION 'Existing beta_feedback_logs table does not match required defaults';
  END IF;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'beta_feedback_logs'
      AND c.contype = 'f'
      AND pg_get_constraintdef(c.oid) = 'FOREIGN KEY (user_id) REFERENCES users(id)'
  ) THEN
    ALTER TABLE "beta_feedback_logs"
      ADD CONSTRAINT "beta_feedback_logs_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
