import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { listCampaignsAction } from "./actions";
import {
  buildPublicLinkPath,
  CampaignStatus,
  listLeaderCampaignLinks,
} from "@/lib/services/campaign";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { LeaderCampaignLinks } from "./leader-campaign-links";

export default async function CampanhasPage() {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    redirect("/sign-in");
  }

  const isAdmin = result.user?.role === "admin";

  if (!isAdmin && result.user?.role !== "leader") {
    redirect("/dashboard");
  }

  if (!isAdmin) {
    const linksResult = await listLeaderCampaignLinks(result.session.userId);

    if (!linksResult.ok) {
      return (
        <section className="flex flex-col items-start justify-start p-6 w-full">
          <div className="w-full">
            <h1 className="text-3xl font-semibold tracking-tight">Meus links</h1>
            <p className="mt-2 text-destructive">{linksResult.message}</p>
          </div>
        </section>
      );
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const links = linksResult.data.map((link) => ({
      ...link,
      url: `${appUrl}${buildPublicLinkPath(link.campaignSlug, link.publicCode)}`,
    }));

    return (
      <section className="flex flex-col items-start justify-start p-4 sm:p-6 w-full">
        <div className="w-full">
          <div className="flex flex-col items-start justify-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Meus links</h1>
            <p className="text-sm text-muted-foreground">
              Compartilhe um link diferente para cada campanha atribuída a você.
            </p>
          </div>
          <div className="mt-6">
            <LeaderCampaignLinks links={links} />
          </div>
        </div>
      </section>
    );
  }

  const campaignsResult = await listCampaignsAction();

  if (!campaignsResult.ok) {
    return (
      <section className="flex flex-col items-start justify-start p-6 w-full">
        <div className="w-full">
          <h1 className="text-3xl font-semibold tracking-tight">Campanhas</h1>
          <p className="text-muted-foreground mt-2">
            Erro ao carregar campanhas: {campaignsResult.message}
          </p>
        </div>
      </section>
    );
  }

  const { campaigns, total } = campaignsResult.data;

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

  return (
    <section className="flex flex-col items-start justify-start p-6 w-full">
      <div className="w-full">
        <div className="flex flex-col items-start justify-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Campanhas</h1>
          <p className="text-muted-foreground">
            Gerencie suas campanhas eleitorais
          </p>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {total} campanha{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""}
          </p>
          <Link href="/dashboard/campanhas/nova">
            <Button>Nova Campanha</Button>
          </Link>
        </div>
        <div className="mt-6 grid gap-4">
          {campaigns.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">
                  Nenhuma campanha encontrada.
                </p>
              </CardContent>
            </Card>
          ) : (
            campaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        <Link
                          href={`/dashboard/campanhas/${campaign.id}`}
                          className="hover:underline"
                        >
                          {campaign.name}
                        </Link>
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        /{campaign.slug}
                      </p>
                    </div>
                    {getStatusBadge(campaign.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  {campaign.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {campaign.description}
                    </p>
                  )}
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>
                      Criada em:{" "}
                      {new Date(campaign.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                    {campaign.openedAt && (
                      <span>
                        Aberta em:{" "}
                        {new Date(campaign.openedAt).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                    {campaign.closedAt && (
                      <span>
                        Encerrada em:{" "}
                        {new Date(campaign.closedAt).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
