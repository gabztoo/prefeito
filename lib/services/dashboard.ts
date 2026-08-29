import { ActionResult } from "@/lib/types";
import {
  CampaignStatus,
  listCampaigns,
  listLeaderCampaignLinks,
} from "@/lib/services/campaign";
import { listLeaders } from "@/lib/services/invitation";
import { getVoterStats } from "@/lib/services/voter";
import { db } from "@/db/drizzle";
import { campaign, campaign_leader, invitation, voter } from "@/db/schema";
import { and, count, desc, eq, gte, max, sql } from "drizzle-orm";

export interface DashboardCampaign {
  id: string;
  name: string;
  slug: string;
  status: CampaignStatus;
  voterCount: number;
  leaderCount: number;
  lastVoterAt: Date | null;
}

export interface DashboardStats {
  totalVoters: number;
  recentVoters: number;
  activeCampaigns: number;
  activeLeaders: number;
  activeLinks: number;
  pendingInvitations: number;
  draftCampaigns: number;
  campaignsWithoutLeaders: number;
  campaigns: DashboardCampaign[];
}

export async function getDashboardStats(
  userId: string,
  role: string
): Promise<ActionResult<DashboardStats>> {
  try {
    const leaderCampaignIds = db
      .select({ campaignId: campaign_leader.campaignId })
      .from(campaign_leader)
      .where(
        and(
          eq(campaign_leader.leaderId, userId),
          eq(campaign_leader.active, true)
        )
      );
    const campaignScope = role === "leader"
      ? sql`${campaign.id} IN ${leaderCampaignIds}`
      : undefined;
    const recentSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentVoterConditions = [gte(voter.createdAt, recentSince)];

    if (role === "leader") {
      recentVoterConditions.push(
        sql`${voter.campaignLeaderId} IN ${leaderCampaignIds}` as typeof recentVoterConditions[number]
      );
    }

    const campaignRowsPromise = db
      .select({
        id: campaign.id,
        name: campaign.name,
        slug: campaign.slug,
        status: campaign.status,
        voterCount: sql<number>`count(distinct ${voter.id})`,
        leaderCount: sql<number>`count(distinct ${campaign_leader.id})`,
        lastVoterAt: max(voter.createdAt),
      })
      .from(campaign)
      .leftJoin(voter, eq(campaign.id, voter.campaignId))
      .leftJoin(
        campaign_leader,
        and(
          eq(campaign.id, campaign_leader.campaignId),
          eq(campaign_leader.active, true)
        )
      )
      .where(campaignScope)
      .groupBy(campaign.id)
      .orderBy(desc(campaign.updatedAt))
      .limit(5);
    const recentVoterPromise = db
      .select({ count: count() })
      .from(voter)
      .where(and(...recentVoterConditions));
    const pendingInvitationPromise = role === "admin"
      ? db
          .select({ count: count() })
          .from(invitation)
          .where(eq(invitation.status, "pending"))
      : Promise.resolve([{ count: 0 }]);
    const draftCampaignPromise = role === "admin"
      ? db
          .select({ count: count() })
          .from(campaign)
          .where(eq(campaign.status, CampaignStatus.DRAFT))
      : Promise.resolve([{ count: 0 }]);
    const leaderlessCampaignPromise = role === "admin"
      ? db
          .select({ id: campaign.id })
          .from(campaign)
          .leftJoin(
            campaign_leader,
            and(
              eq(campaign.id, campaign_leader.campaignId),
              eq(campaign_leader.active, true)
            )
          )
          .where(
            and(
              eq(campaign.status, CampaignStatus.OPEN),
              sql`${campaign_leader.id} IS NULL`
            )
          )
      : Promise.resolve([] as Array<{ id: string }>);
    const dashboardDataPromise = Promise.all([
      campaignRowsPromise,
      recentVoterPromise,
      pendingInvitationPromise,
      draftCampaignPromise,
      leaderlessCampaignPromise,
    ]);

    const [voterStatsResult, campaignsResult, scopeResult, dashboardData] =
      await Promise.all([
        getVoterStats(userId, role),
        listCampaigns(userId, role, {
          status: CampaignStatus.OPEN,
          limit: 1,
        }),
        role === "admin" ? listLeaders() : listLeaderCampaignLinks(userId),
        dashboardDataPromise,
      ]);
    const [
      campaignRows,
      recentVoterResult,
      pendingInvitationResult,
      draftCampaignResult,
      leaderlessCampaignRows,
    ] = dashboardData;

    if (!voterStatsResult.ok) return voterStatsResult;
    if (!campaignsResult.ok) return campaignsResult;
    if (!scopeResult.ok) return scopeResult;

    if (role === "admin") {
      const leadersResult = scopeResult as Awaited<ReturnType<typeof listLeaders>>;

      if (!leadersResult.ok) return leadersResult;

      return {
        ok: true,
        data: {
          totalVoters: voterStatsResult.data.grandTotal,
          recentVoters: Number(recentVoterResult[0]?.count ?? 0),
          activeCampaigns: Number(campaignsResult.data.total),
          activeLeaders: leadersResult.data.leaders.filter(
            (leader) => !leader.banned && leader.invitationStatus === "accepted"
          ).length,
          activeLinks: 0,
          pendingInvitations: Number(pendingInvitationResult[0]?.count ?? 0),
          draftCampaigns: Number(draftCampaignResult[0]?.count ?? 0),
          campaignsWithoutLeaders: leaderlessCampaignRows.length,
          campaigns: campaignRows.map((campaignRow) => ({
            ...campaignRow,
            status: campaignRow.status as CampaignStatus,
            voterCount: Number(campaignRow.voterCount),
            leaderCount: Number(campaignRow.leaderCount),
          })),
        },
      };
    }

    const linksResult = scopeResult as Awaited<
      ReturnType<typeof listLeaderCampaignLinks>
    >;

    if (!linksResult.ok) return linksResult;

    return {
      ok: true,
      data: {
        totalVoters: voterStatsResult.data.grandTotal,
        recentVoters: Number(recentVoterResult[0]?.count ?? 0),
        activeCampaigns: Number(campaignsResult.data.total),
        activeLeaders: 0,
        activeLinks: linksResult.data.length,
        pendingInvitations: Number(pendingInvitationResult[0]?.count ?? 0),
        draftCampaigns: Number(draftCampaignResult[0]?.count ?? 0),
        campaignsWithoutLeaders: leaderlessCampaignRows.length,
        campaigns: campaignRows.map((campaignRow) => ({
          ...campaignRow,
          status: campaignRow.status as CampaignStatus,
          voterCount: Number(campaignRow.voterCount),
          leaderCount: Number(campaignRow.leaderCount),
        })),
      },
    };
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao carregar estatísticas do dashboard",
    };
  }
}
