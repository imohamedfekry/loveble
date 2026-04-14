CREATE TABLE "temp_users" (
	"id" bigint PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"otp_hash" varchar(255) NOT NULL,
	"otp_expiry" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "temp_users_email_unique" UNIQUE("email")
);
