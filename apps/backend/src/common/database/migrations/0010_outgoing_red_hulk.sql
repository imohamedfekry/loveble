ALTER TABLE "files" ADD COLUMN "content_type" varchar(255) DEFAULT 'text/plain; charset=utf-8' NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "size" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "checksum" varchar(64);--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "is_binary" boolean DEFAULT false NOT NULL;