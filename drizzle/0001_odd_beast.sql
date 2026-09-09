CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "actors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "star_numbers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number_code" text NOT NULL,
	"display_number" text NOT NULL,
	"format_version" integer DEFAULT 1 NOT NULL,
	"category" text NOT NULL,
	"status" text NOT NULL,
	"memorability_score" integer,
	"pattern_tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_batch_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "star_numbers_display_number_check" CHECK ("star_numbers"."display_number" = ('*' || "star_numbers"."number_code")),
	CONSTRAINT "star_numbers_format_version_check" CHECK ("star_numbers"."format_version" >= 1),
	CONSTRAINT "star_numbers_category_check" CHECK ("star_numbers"."category" IN ('silver', 'gold', 'platinum', 'diamond')),
	CONSTRAINT "star_numbers_status_check" CHECK ("star_numbers"."status" IN ('available', 'reserved', 'sold', 'suspended', 'released', 'retired'))
);
--> statement-breakpoint
CREATE TABLE "inventory_import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_name" text NOT NULL,
	"source_hash" text NOT NULL,
	"mode" text NOT NULL,
	"status" text NOT NULL,
	"summary_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actor_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_batches_mode_check" CHECK ("inventory_import_batches"."mode" IN ('dry_run', 'commit')),
	CONSTRAINT "import_batches_status_check" CHECK ("inventory_import_batches"."status" IN ('started', 'completed', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "inventory_import_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"line_number" integer NOT NULL,
	"raw_value_json" jsonb NOT NULL,
	"normalized_value_json" jsonb,
	"result" text NOT NULL,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_rows_result_check" CHECK ("inventory_import_rows"."result" IN ('accepted', 'rejected', 'duplicate', 'missing', 'conflict'))
);
--> statement-breakpoint
ALTER TABLE "actors" ADD CONSTRAINT "actors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "star_numbers" ADD CONSTRAINT "star_numbers_source_batch_id_inventory_import_batches_id_fk" FOREIGN KEY ("source_batch_id") REFERENCES "public"."inventory_import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_import_batches" ADD CONSTRAINT "inventory_import_batches_actor_id_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_import_rows" ADD CONSTRAINT "inventory_import_rows_batch_id_inventory_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."inventory_import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_unique" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "actors_user_organization_unique" ON "actors" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "actors_organization_idx" ON "actors" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "actors_user_idx" ON "actors" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "star_numbers_number_code_unique" ON "star_numbers" USING btree ("number_code");--> statement-breakpoint
CREATE UNIQUE INDEX "star_numbers_display_number_unique" ON "star_numbers" USING btree ("display_number");--> statement-breakpoint
CREATE INDEX "star_numbers_category_idx" ON "star_numbers" USING btree ("category");--> statement-breakpoint
CREATE INDEX "star_numbers_status_idx" ON "star_numbers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "star_numbers_category_status_idx" ON "star_numbers" USING btree ("category","status");--> statement-breakpoint
CREATE INDEX "star_numbers_source_batch_idx" ON "star_numbers" USING btree ("source_batch_id");--> statement-breakpoint
CREATE INDEX "import_batches_source_hash_idx" ON "inventory_import_batches" USING btree ("source_hash");--> statement-breakpoint
CREATE INDEX "import_batches_mode_idx" ON "inventory_import_batches" USING btree ("mode");--> statement-breakpoint
CREATE INDEX "import_batches_status_idx" ON "inventory_import_batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "import_batches_actor_idx" ON "inventory_import_batches" USING btree ("actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_rows_batch_line_unique" ON "inventory_import_rows" USING btree ("batch_id","line_number");--> statement-breakpoint
CREATE INDEX "import_rows_batch_idx" ON "inventory_import_rows" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "import_rows_result_idx" ON "inventory_import_rows" USING btree ("result");