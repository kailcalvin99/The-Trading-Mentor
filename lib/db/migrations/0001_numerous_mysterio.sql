CREATE TABLE "beta_feedback_logs" (
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
ALTER TABLE "beta_feedback_logs" ADD CONSTRAINT "beta_feedback_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;