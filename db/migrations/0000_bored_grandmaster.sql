CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actorId" text NOT NULL,
	"action" varchar(80) NOT NULL,
	"entityType" varchar(40) NOT NULL,
	"entityId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(140) NOT NULL,
	"description" text,
	"status" varchar(10) DEFAULT 'draft' NOT NULL,
	"createdBy" text NOT NULL,
	"openedAt" timestamp,
	"closedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "campaign_leader" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaignId" uuid NOT NULL,
	"leaderId" text NOT NULL,
	"publicCode" varchar(64) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "campaign_leader_publicCode_unique" UNIQUE("publicCode"),
	CONSTRAINT "campaign_leader_campaignId_leaderId_unique" UNIQUE("campaignId","leaderId"),
	CONSTRAINT "campaign_leader_id_campaignId_unique" UNIQUE("id","campaignId")
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"email" text NOT NULL,
	"status" varchar(10) DEFAULT 'pending' NOT NULL,
	"deliveryVersion" integer DEFAULT 1 NOT NULL,
	"invitedBy" text NOT NULL,
	"expiresAt" timestamp,
	"acceptedAt" timestamp,
	"revokedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitation_email_pending_unique" UNIQUE("email","status")
);
--> statement-breakpoint
CREATE TABLE "rateLimit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer,
	"lastRequest" bigint,
	CONSTRAINT "rateLimit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "registration_rate_limit" (
	"bucketHash" char(64) PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	"impersonatedBy" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text,
	"banned" boolean DEFAULT false NOT NULL,
	"banReason" text,
	"banExpires" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voter" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaignId" uuid NOT NULL,
	"campaignLeaderId" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"zone" varchar(4) NOT NULL,
	"section" varchar(4) NOT NULL,
	"phone" varchar(11) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "voter_campaignId_phone_unique" UNIQUE("campaignId","phone")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_actorId_user_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign" ADD CONSTRAINT "campaign_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_leader" ADD CONSTRAINT "campaign_leader_campaignId_campaign_id_fk" FOREIGN KEY ("campaignId") REFERENCES "public"."campaign"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_leader" ADD CONSTRAINT "campaign_leader_leaderId_user_id_fk" FOREIGN KEY ("leaderId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_invitedBy_user_id_fk" FOREIGN KEY ("invitedBy") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voter" ADD CONSTRAINT "voter_campaignLeaderId_campaignId_campaign_leader_id_campaignId_fk" FOREIGN KEY ("campaignLeaderId","campaignId") REFERENCES "public"."campaign_leader"("id","campaignId") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_leader_leaderId_idx" ON "campaign_leader" USING btree ("leaderId");--> statement-breakpoint
CREATE INDEX "campaign_leader_campaignId_idx" ON "campaign_leader" USING btree ("campaignId");--> statement-breakpoint
CREATE INDEX "voter_campaignLeaderId_createdAt_idx" ON "voter" USING btree ("campaignLeaderId","createdAt");--> statement-breakpoint
CREATE INDEX "voter_campaignId_createdAt_idx" ON "voter" USING btree ("campaignId","createdAt");--> statement-breakpoint
CREATE INDEX "voter_zone_idx" ON "voter" USING btree ("zone");--> statement-breakpoint
CREATE INDEX "voter_section_idx" ON "voter" USING btree ("section");