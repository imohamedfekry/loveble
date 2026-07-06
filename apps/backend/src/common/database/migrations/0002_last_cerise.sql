ALTER TABLE "files" ALTER COLUMN "storage_key" SET DATA TYPE varchar(1024);--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "mime_type";--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "size";--> statement-breakpoint
ALTER TABLE "files" DROP COLUMN "version";--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_unique_name_per_folder_idx" UNIQUE NULLS NOT DISTINCT("project_id","parent_id","name");