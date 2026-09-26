CREATE TYPE "public"."role_enum" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "message_status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "message_status" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "role" "role_enum" NOT NULL;