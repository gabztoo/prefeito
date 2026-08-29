import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getCampaignAction,
  transitionCampaignAction,
} from "../actions";
import { listLeaders } from "@/lib/services/invitation";
import {
  buildPublicLinkUrl,
  CampaignStatus,
} from "@/lib/services/campaign";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { AssignLeaderForm } from "../assign-leader-form";
import { LeaderCampaignLinks } from "../leader-campaign-links";

export default async function CampanhaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    redirect("/sign-in");
  }

  if (result.user?.role !== "admin") {
    redirect("/dashboard");
  }

  const campaignResult = await getCampaignAction(id);

  if (!campaignResult.ok) {
    return (
      <section className="flex flex-col items-start justify-start p-6 w-full">
        <div className="w-full">
          <h1 className="text-3xl font-semibold tracking-tight">Campanha</h1>
          <p className="text-muted-foreground mt-2">
            {campaignResult.message}
          </p>
          <Link href="/dashboard/campanhas" className="mt-4 inline-block">
            <Button variant="outline">Voltar</Button>
          </Link>
        </div>
      </section>
    );
  }

  const campaign = campaignResult.data;
  const leadersResult = await listLeaders();
  const leaders = leadersResult.ok ? leadersResult.data.leaders : [];
  const availableLeaders = leaders.filter(
    (leader) => !campaign.leaders.some((link) => link.leaderId === leader.id)
  );
  const canAssignLeader = campaign.status !== CampaignStatus.CLOSED && availableLeaders.length > 0;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const linkedLeaderLinks = campaign.leaders.map((leader) => ({
    campaignLeaderId: leader.id,
    leaderName: leader.leaderName,
    leaderEmail: leader.leaderEmail,
    campaignName: campaign.name,
    campaignSlug: campaign.slug,
    campaignStatus: campaign.status,
    publicCode: leader.publicCode,
    active: leader.active,
    url: buildPublicLinkUrl(appUrl, campaign.slug, leader.publicCode),
  }));

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case CampaignStatus.DRAFT:
        return <Badge variant="outline">Rascunho</Badge>;
      case CampaignStatus.OPEN:
        return <Badge variant="default">Aberta</Badge>;
      case CampaignStatus.CLOSED:
        return <Badge variant="secondary">Encerrada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const canOpen = campaign.status === CampaignStatus.DRAFT;
  const canClose = campaign.status === CampaignStatus.OPEN;

  return (
    <section className="flex flex-col items-start justify-start p-6 w-full">
      <div className="w-full">
        <div className="flex flex-col items-start justify-center gap-2">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/campanhas">
              <Button variant="outline" size="sm">
                Voltar
              </Button>
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight">
              {campaign.name}
            </h1>
            {getStatusBadge(campaign.status)}
          </div>
          <p className="text-muted-foreground">/{campaign.slug}</p>
        </div>

        <div className="mt-6 grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Adicionar líder</CardTitle>
            </CardHeader>
            <CardContent>
              <AssignLeaderForm
                campaignId={id}
                campaignSlug={campaign.slug}
                leaders={availableLeaders.map((leader) => ({
                  id: leader.id,
                  name: leader.name,
                  email: leader.email,
                }))}
                disabled={!canAssignLeader}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                O link exclusivo será criado automaticamente para a campanha e o líder selecionados.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhes</CardTitle>
            </CardHeader>
            <CardContent>
              {campaign.description && (
                <p className="text-sm text-muted-foreground mb-4">
                  {campaign.description}
                </p>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Criada em:</span>{" "}
                  {new Date(campaign.createdAt).toLocaleDateString("pt-BR")}
                </div>
                {campaign.openedAt && (
                  <div>
                    <span className="font-medium">Aberta em:</span>{" "}
                    {new Date(campaign.openedAt).toLocaleDateString("pt-BR")}
                  </div>
                )}
                {campaign.closedAt && (
                  <div>
                    <span className="font-medium">Encerrada em:</span>{" "}
                    {new Date(campaign.closedAt).toLocaleDateString("pt-BR")}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                {canOpen && (
                  <form
                    action={async () => {
                      "use server";
                      await transitionCampaignAction(
                        id,
                        CampaignStatus.OPEN
                      );
                    }}
                  >
                    <Button type="submit">Abrir Campanha</Button>
                  </form>
                )}
                {canClose && (
                  <form
                    action={async () => {
                      "use server";
                      await transitionCampaignAction(
                        id,
                        CampaignStatus.CLOSED
                      );
                    }}
                  >
                    <Button type="submit" variant="destructive">
                      Encerrar Campanha
                    </Button>
                  </form>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Líderes Vinculados</CardTitle>
            </CardHeader>
            <CardContent>
              <LeaderCampaignLinks links={linkedLeaderLinks} />
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
