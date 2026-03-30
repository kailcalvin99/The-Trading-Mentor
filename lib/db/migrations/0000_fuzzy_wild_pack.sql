CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"pair" text NOT NULL,
	"entry_time" text NOT NULL,
	"risk_pct" numeric(5, 2) NOT NULL,
	"liquidity_sweep" boolean DEFAULT false NOT NULL,
	"outcome" text,
	"notes" text,
	"behavior_tag" text,
	"followed_time_rule" boolean,
	"has_fvg_confirmation" boolean,
	"stress_level" integer,
	"is_draft" boolean DEFAULT false NOT NULL,
	"ticker" text,
	"side_direction" text,
	"coach_feedback" text,
	"setup_score" integer,
	"setup_type" text,
	"entry_price" numeric(12, 4),
	"stop_loss" numeric(12, 4),
	"take_profit" numeric(12, 4),
	"trading_session" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prop_account" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"starting_balance" numeric(12, 2) NOT NULL,
	"current_balance" numeric(12, 2) NOT NULL,
	"daily_loss" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_drawdown" numeric(12, 2) DEFAULT '0' NOT NULL,
	"max_daily_loss_pct" numeric(5, 2) DEFAULT '2' NOT NULL,
	"max_total_drawdown_pct" numeric(5, 2) DEFAULT '5' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"is_founder" boolean DEFAULT false NOT NULL,
	"founder_number" integer,
	"default_session" text,
	"preferred_entry_style" text,
	"default_pairs" text,
	"app_mode" text DEFAULT 'full' NOT NULL,
	"default_risk_pct" text,
	"last_login_at" timestamp,
	"webhook_token" uuid DEFAULT gen_random_uuid(),
	"academy_progress" text,
	"avatar_url" text,
	"total_xp" integer DEFAULT 0 NOT NULL,
	"login_streak" integer DEFAULT 0 NOT NULL,
	"last_login_date" text,
	"routine_times" text,
	"widget_prefs" text,
	"bio" text,
	"twitter_handle" varchar(64),
	"discord_handle" varchar(64),
	"is_public" boolean DEFAULT false NOT NULL,
	"trading_rules" text,
	"quiz_done" boolean DEFAULT false NOT NULL,
	"tour_shown" boolean DEFAULT false NOT NULL,
	"is_beta_tester" boolean DEFAULT false NOT NULL,
	"beta_trial_ends_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "subscription_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"level" integer DEFAULT 0 NOT NULL,
	"monthly_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"annual_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"annual_discount_pct" integer DEFAULT 0 NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"stripe_price_id_monthly" text,
	"stripe_price_id_annual" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"tier_id" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"billing_cycle" text DEFAULT 'monthly' NOT NULL,
	"custom_monthly_price" numeric(10, 2),
	"custom_annual_price" numeric(10, 2),
	"founder_discount" boolean DEFAULT false NOT NULL,
	"founder_discount_ends_at" timestamp,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"stripe_checkout_session_id" text,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "community_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"category" text DEFAULT 'strategy-talk' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_replies" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "community_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "video_watched" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"video_id" text NOT NULL,
	"watched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cooldown_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"trigger_tags" text,
	"duration_seconds" integer DEFAULT 300 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "planner_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" text NOT NULL,
	"data" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"emoji" text,
	"category" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beta_invite_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"used_by_user_id" integer,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "beta_invite_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prop_account" ADD CONSTRAINT "prop_account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_tier_id_subscription_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."subscription_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_replies" ADD CONSTRAINT "community_replies_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_replies" ADD CONSTRAINT "community_replies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_subscriptions" ADD CONSTRAINT "community_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_watched" ADD CONSTRAINT "video_watched_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planner_entries" ADD CONSTRAINT "planner_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beta_invite_codes" ADD CONSTRAINT "beta_invite_codes_used_by_user_id_users_id_fk" FOREIGN KEY ("used_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "community_subscriptions_user_cat_idx" ON "community_subscriptions" USING btree ("user_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX "post_likes_post_user_idx" ON "post_likes" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "video_watched_user_video_idx" ON "video_watched" USING btree ("user_id","video_id");--> statement-breakpoint
CREATE UNIQUE INDEX "planner_entries_user_date_idx" ON "planner_entries" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "user_tags_user_name_idx" ON "user_tags" USING btree ("user_id","name");