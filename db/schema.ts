import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  bigint,
  char,
  date,
  unique,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Better Auth Tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  username: text("username").unique(),
  mustChangePassword: boolean("mustChangePassword").notNull().default(false),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  role: text("role"),
  coordinatorId: text("coordinatorId"),
  rg: text("rg"),
  cpf: text("cpf"),
  cep: text("cep"),
  address: text("address"),
  imageUrl: text("imageUrl"),
  voterTitle: text("voterTitle"),
  zone: text("zone"),
  section: text("section"),
  localAtuacao: text("localAtuacao"),
  banned: boolean("banned").notNull().default(false),
  banReason: text("banReason"),
  banExpires: timestamp("banExpires"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
}, (table) => ({
  userCoordinatorIdIdx: index("user_coordinatorId_idx").on(table.coordinatorId),
  userCoordinatorIdForeignKey: foreignKey({
    columns: [table.coordinatorId],
    foreignColumns: [table.id],
  }).onDelete("set null"),
  userCpfUnique: unique("user_cpf_unique").on(table.cpf),
}));

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonatedBy"),
  activeOrganizationId: text("activeOrganizationId"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  issuer: text("issuer"),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Electoral Tables
export const campaign = pgTable("campaign", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 140 }).notNull().unique(),
  description: text("description"),
  status: varchar("status", { length: 10 }).notNull().default("draft"),
  createdBy: text("createdBy")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  openedAt: timestamp("openedAt"),
  closedAt: timestamp("closedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const campaign_leader = pgTable(
  "campaign_leader",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaignId")
      .notNull()
      .references(() => campaign.id, { onDelete: "restrict" }),
    leaderId: text("leaderId")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    publicCode: varchar("publicCode", { length: 64 }).notNull().unique(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    campaignLeaderUnique: unique("campaign_leader_campaignId_leaderId_unique").on(
      table.campaignId,
      table.leaderId
    ),
    campaignLeaderIdCampaignIdUnique: unique(
      "campaign_leader_id_campaignId_unique"
    ).on(table.id, table.campaignId),
    campaignLeaderLeaderIdIdx: index("campaign_leader_leaderId_idx").on(
      table.leaderId
    ),
    campaignLeaderCampaignIdIdx: index("campaign_leader_campaignId_idx").on(
      table.campaignId
    ),
  })
);

export const voter = pgTable(
  "voter",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaignId"),
    campaignLeaderId: uuid("campaignLeaderId"),
    leaderId: text("leaderId").references(() => user.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 120 }).notNull(),
    motherName: varchar("motherName", { length: 120 }).notNull(),
    birthDate: date("birthDate").notNull(),
    zone: varchar("zone", { length: 4 }).notNull(),
    section: varchar("section", { length: 4 }).notNull(),
    phone: varchar("phone", { length: 11 }).notNull(),
    voterTitle: text("voterTitle"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    voterCampaignIdPhoneUnique: unique("voter_campaignId_phone_unique").on(
      table.campaignId,
      table.phone
    ),
    voterCampaignLeaderIdCampaignIdForeignKey: foreignKey({
      columns: [table.campaignLeaderId, table.campaignId],
      foreignColumns: [campaign_leader.id, campaign_leader.campaignId],
    }).onDelete("restrict"),
    voterCampaignLeaderIdCreatedAtIdx: index(
      "voter_campaignLeaderId_createdAt_idx"
    ).on(table.campaignLeaderId, table.createdAt),
    voterCampaignIdCreatedAtIdx: index("voter_campaignId_createdAt_idx").on(
      table.campaignId,
      table.createdAt
    ),
    voterZoneIdx: index("voter_zone_idx").on(table.zone),
    voterSectionIdx: index("voter_section_idx").on(table.section),
  })
);

export const invitation = pgTable(
  "invitation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    email: text("email").notNull(),
    status: varchar("status", { length: 10 }).notNull().default("pending"),
    deliveryVersion: integer("deliveryVersion").notNull().default(1),
    invitedBy: text("invitedBy")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    expiresAt: timestamp("expiresAt"),
    acceptedAt: timestamp("acceptedAt"),
    revokedAt: timestamp("revokedAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    invitationEmailPendingUnique: unique(
      "invitation_email_pending_unique"
    ).on(table.email, table.status),
  })
);

export const registration_rate_limit = pgTable("registration_rate_limit", {
  bucketHash: char("bucketHash", { length: 64 }).primaryKey(),
  count: integer("count").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
}, (table) => ({
  registrationRateLimitExpiresAtIdx: index(
    "registration_rate_limit_expiresAt_idx"
  ).on(table.expiresAt),
}));

export const audit_event = pgTable("audit_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: text("actorId")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  action: varchar("action", { length: 80 }).notNull(),
  entityType: varchar("entityType", { length: 40 }).notNull(),
  entityId: text("entityId").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const registration_token = pgTable(
  "registration_token",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token: varchar("token", { length: 64 }).notNull().unique(),
    role: varchar("role", { length: 20 }).notNull(),
    invitedBy: text("invitedBy")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    coordinatorId: text("coordinatorId").references(() => user.id, {
      onDelete: "set null",
    }),
    leaderId: text("leaderId").references(() => user.id, {
      onDelete: "set null",
    }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => ({
    registrationTokenTokenIdx: index("registration_token_token_idx").on(
      table.token
    ),
    registrationTokenInvitedByIdx: index("registration_token_invitedBy_idx").on(
      table.invitedBy
    ),
    registrationTokenCoordinatorIdIdx: index(
      "registration_token_coordinatorId_idx"
    ).on(table.coordinatorId),
    registrationTokenLeaderIdIdx: index("registration_token_leaderId_idx").on(
      table.leaderId
    ),
  })
);

// Better Auth Rate Limit Table
export const rateLimit = pgTable("rateLimit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count"),
  lastRequest: bigint("lastRequest", { mode: "number" }),
});
