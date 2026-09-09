CREATE TABLE "vivr_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vivr_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"config_json" jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"published_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vivr_versions_sequence_check" CHECK ("vivr_versions"."sequence" >= 1)
);
--> statement-breakpoint
CREATE TABLE "vivrs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"brand_color" text DEFAULT '#4154a3' NOT NULL,
	"theme_mode" text DEFAULT 'light' NOT NULL,
	"logo_image_url" text,
	"cover_image_url" text,
	"current_draft_version_id" uuid,
	"current_published_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vivrs_slug_check" CHECK ("vivrs"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "vivrs_status_check" CHECK ("vivrs"."status" IN ('draft', 'published', 'archived')),
	CONSTRAINT "vivrs_theme_mode_check" CHECK ("vivrs"."theme_mode" IN ('light', 'dark')),
	CONSTRAINT "vivrs_brand_color_check" CHECK ("vivrs"."brand_color" ~ '^#[0-9a-fA-F]{6}$')
);
--> statement-breakpoint
ALTER TABLE "vivr_versions" ADD CONSTRAINT "vivr_versions_vivr_id_vivrs_id_fk" FOREIGN KEY ("vivr_id") REFERENCES "public"."vivrs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vivr_versions" ADD CONSTRAINT "vivr_versions_published_by_id_actors_id_fk" FOREIGN KEY ("published_by_id") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vivrs" ADD CONSTRAINT "vivrs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vivrs" ADD CONSTRAINT "vivrs_current_draft_version_id_vivr_versions_id_fk" FOREIGN KEY ("current_draft_version_id") REFERENCES "public"."vivr_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vivrs" ADD CONSTRAINT "vivrs_current_published_version_id_vivr_versions_id_fk" FOREIGN KEY ("current_published_version_id") REFERENCES "public"."vivr_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "vivr_versions_vivr_sequence_unique" ON "vivr_versions" USING btree ("vivr_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "vivr_versions_one_draft" ON "vivr_versions" USING btree ("vivr_id") WHERE "vivr_versions"."published_at" IS NULL;--> statement-breakpoint
CREATE INDEX "vivr_versions_vivr_published_idx" ON "vivr_versions" USING btree ("vivr_id","published_at");--> statement-breakpoint
CREATE INDEX "vivr_versions_published_idx" ON "vivr_versions" USING btree ("published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "vivrs_slug_unique" ON "vivrs" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "vivrs_organization_idx" ON "vivrs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "vivrs_status_idx" ON "vivrs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vivrs_organization_status_idx" ON "vivrs" USING btree ("organization_id","status");