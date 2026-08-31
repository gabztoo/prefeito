CREATE TABLE "registration_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(64) NOT NULL,
	"role" varchar(20) NOT NULL,
	"invitedBy" text NOT NULL,
	"coordinatorId" text,
	"active" boolean NOT NULL DEFAULT true,
	"createdAt" timestamp NOT NULL DEFAULT now(),
	"updatedAt" timestamp NOT NULL DEFAULT now(),
	CONSTRAINT "registration_token_token_unique" UNIQUE("token"),
	CONSTRAINT "registration_token_invitedBy_user_id_fk" FOREIGN KEY ("invitedBy") REFERENCES "user"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "registration_token_coordinatorId_user_id_fk" FOREIGN KEY ("coordinatorId") REFERENCES "user"("id") ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "registration_token_token_idx" ON "registration_token" ("token");--> statement-breakpoint
CREATE INDEX "registration_token_invitedBy_idx" ON "registration_token" ("invitedBy");--> statement-breakpoint
CREATE INDEX "registration_token_coordinatorId_idx" ON "registration_token" ("coordinatorId");
