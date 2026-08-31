import { ActionResult } from "@/lib/types";
import {
  CampaignStatus,
  listCampaigns,
  listLeaderCampaignLinks,
} from "@/lib/services/campaign";
import { listCoordinators, listLeaders, listLeadersByCoordinator } from "@/lib/services/invitation";
import { getVoterStats } from "@/lib/services/voter";
import { db } from "@/db/drizzle";
import { campaign, campaign_leader, invitation, voter, user } from "@/db/schema";
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
  activeCoordinators: number;
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

    const coordinatorLeaderIds = role === "coordinator"
      ? db
          .select({ id: user.id })
          .from(user)
          .where(
            and(
              eq(user.role, "leader"),
              eq(user.coordinatorId, userId)
            )
          )
      : undefined;

    const coordinatorCampaignIds = role === "coordinator" && coordinatorLeaderIds
      ? db
          .select({ campaignId: campaign_leader.campaignId })
          .from(campaign_leader)
          .where(
            and(
              sql`${campaign_leader.leaderId} IN ${coordinatorLeaderIds}`,
              eq(campaign_leader.active, true)
            )
          )
      : undefined;

    let campaignScope;
    if (role === "leader") {
      campaignScope = sql`${campaign.id} IN ${leaderCampaignIds}`;
    } else if (role === "coordinator" && coordinatorCampaignIds) {
      campaignScope = sql`${campaign.id} IN ${coordinatorCampaignIds}`;
    }

    const recentSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentVoterConditions = [gte(voter.createdAt, recentSince)];

    if (role === "leader") {
      recentVoterConditions.push(
        sql`${voter.campaignLeaderId} IN ${leaderCampaignIds}` as typeof recentVoterConditions[number]
      );
    }

    if (role === "coordinator" && coordinatorLeaderIds) {
      const coordinatorLeaderLinkIds = db
        .select({ id: campaign_leader.id })
        .from(campaign_leader)
        .where(
          and(
            sql`${campaign_leader.leaderId} IN ${coordinatorLeaderIds}`,
            eq(campaign_leader.active, true)
          )
        );
      recentVoterConditions.push(
        sql`${voter.campaignLeaderId} IN ${coordinatorLeaderLinkIds}` as typeof recentVoterConditions[number]
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

    const scopeResult = role === "admin"
      ? await listLeaders()
      : role === "coordinator"
      ? await listLeadersByCoordinator(userId)
      : await listLeaderCampaignLinks(userId);

    const [voterStatsResult, campaignsResult, dashboardData] =
      await Promise.all([
        getVoterStats(userId, role),
        listCampaigns(userId, role, {
          status: CampaignStatus.OPEN,
          limit: 1,
        }),
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
      const coordinatorsResult = await listCoordinators();

      if (!leadersResult.ok) return leadersResult;
      if (!coordinatorsResult.ok) return coordinatorsResult;

      return {
        ok: true,
        data: {
          totalVoters: voterStatsResult.data.grandTotal,
          recentVoters: Number(recentVoterResult[0]?.count ?? 0),
          activeCampaigns: Number(campaignsResult.data.total),
          activeLeaders: leadersResult.data.leaders.filter(
            (leader) => !leader.banned && leader.invitationStatus === "accepted"
          ).length,
          activeCoordinators: coordinatorsResult.data.coordinators.filter(
            (coordinator) => !coordinator.banned && coordinator.invitationStatus === "accepted"
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

    if (role === "coordinator") {
      const leadersResult = scopeResult as Awaited<ReturnType<typeof listLeadersByCoordinator>>;

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
          activeCoordinators: 0,
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
        activeCoordinators: 0,
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
