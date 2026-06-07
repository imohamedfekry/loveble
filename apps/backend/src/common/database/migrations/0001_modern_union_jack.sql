CREATE TYPE "export_status_enum" AS ENUM('exporting', 'completed', 'failed');--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "export_status" "export_status_enum" DEFAULT 'exporting' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "export_repo_url" varchar(255);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;