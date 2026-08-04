ALTER TABLE "files" ALTER COLUMN "storage_key" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "storage_key" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "files" ALTER COLUMN "storage_key" SET NOT NULL;