import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  FilePlus2,
  FileText,
  MailWarning,
  Megaphone,
  UserPlus,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CampaignStatus } from "@/lib/services/campaign";
import {
  getDashboardStats,
  type DashboardCampaign,
  type DashboardStats,
} from "@/lib/services/dashboard";

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR");
}

function formatCountLabel(
  value: number,
  singular: string,
  plural: string
) {
  return value === 1
    ? `1 ${singular}`
    : `${formatNumber(value)} ${plural}`;
}

function formatDate(value: Date | null) {
  if (!value) return "Ainda não";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function getCampaignStatus(status: CampaignStatus) {
  switch (status) {
    case CampaignStatus.OPEN:
      return { label: "Aberta", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
    case CampaignStatus.CLOSED:
      return { label: "Encerrada", className: "border-slate-200 bg-slate-100 text-slate-600" };
    default:
      return { label: "Rascunho", className: "border-amber-200 bg-amber-50 text-amber-700" };
  }
}

function CampaignRow({ campaign }: { campaign: DashboardCampaign }) {
  const status = getCampaignStatus(campaign.status);

  return (
    <Link
      href={`/dashboard/campanhas/${campaign.id}`}
      className="group block border-t px-6 py-4 transition-[background-color] hover:bg-muted/40 focus-visible:bg-muted/40"
      aria-label={`Gerenciar campanha ${campaign.name}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold group-hover:text-primary">
              {campaign.name}
            </h3>
            <Badge className={status.className}>{status.label}</Badge>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            /{campaign.slug}
          </p>
        </div>
        <ArrowUpRight
          className="hidden h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:block"
          aria-hidden="true"
        />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-3 text-sm">
        <div>
          <p className="font-semibold tabular-nums">{formatNumber(campaign.voterCount)}</p>
          <p className="text-xs text-muted-foreground">Eleitores</p>
        </div>
        <div>
          <p className="font-semibold tabular-nums">{formatNumber(campaign.leaderCount)}</p>
          <p className="text-xs text-muted-foreground">Líderes</p>
        </div>
        <div>
          <p className="font-semibold">{formatDate(campaign.lastVoterAt)}</p>
          <p className="text-xs text-muted-foreground">Último cadastro</p>
        </div>
      </div>
    </Link>
  );
}

function CampaignDistribution({ campaigns }: { campaigns: DashboardCampaign[] }) {
  const maxVoterCount = Math.max(...campaigns.map((campaign) => campaign.voterCount), 1);

  return (
    <Card className="gap-0 overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Distribuição
          </p>
          <h2 className="mt-2 text-lg font-semibold">Cadastros por campanha</h2>
        </div>
        <BarChart3 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Crie uma campanha para acompanhar os cadastros aqui.
          </p>
        ) : (
          campaigns.map((campaign) => {
            const width = Math.max(
              (campaign.voterCount / maxVoterCount) * 100,
              campaign.voterCount > 0 ? 4 : 0
            );

            return (
              <div key={campaign.id}>
                <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                  <span className="min-w-0 truncate font-medium">{campaign.name}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatNumber(campaign.voterCount)}
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label={`Cadastros em ${campaign.name}`}
                  aria-valuenow={campaign.voterCount}
                  aria-valuemin={0}
                  aria-valuemax={maxVoterCount}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function AttentionPanel({ stats }: { stats: DashboardStats }) {
  const attentionItems = [
    stats.pendingInvitations > 0 && {
      href: "/dashboard/lideres",
      icon: MailWarning,
      title: formatCountLabel(stats.pendingInvitations, "convite pendente", "convites pendentes"),
      description: "Aguardando aceite do líder",
    },
    stats.draftCampaigns > 0 && {
      href: "/dashboard/campanhas",
      icon: FileText,
      title: formatCountLabel(stats.draftCampaigns, "campanha em rascunho", "campanhas em rascunho"),
      description: "Pronta para ser configurada",
    },
    stats.campaignsWithoutLeaders > 0 && {
      href: "/dashboard/campanhas",
      icon: Users,
      title: formatCountLabel(
        stats.campaignsWithoutLeaders,
        "campanha sem líder",
        "campanhas sem líder"
      ),
      description: "Abra a campanha para gerar um link",
    },
  ].filter(Boolean) as Array<{
    href: string;
    icon: typeof MailWarning;
    title: string;
    description: string;
  }>;

  return (
    <Card className="gap-0 overflow-hidden">
      <CardHeader className="border-b pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Operação
        </p>
        <h2 className="mt-2 text-lg font-semibold">Atenção necessária</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Itens que podem bloquear o andamento das campanhas.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {attentionItems.length === 0 ? (
          <div className="flex items-start gap-3 p-6">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
            <div>
              <p className="font-medium">Tudo em ordem</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Não há pendências críticas no momento.
              </p>
            </div>
          </div>
        ) : (
          attentionItems.map(({ href, icon: Icon, title, description }) => (
            <Link
              key={title}
              href={href}
              className="group flex items-start gap-3 border-t px-6 py-4 transition-[background-color] hover:bg-muted/40 focus-visible:bg-muted/40"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium group-hover:text-primary">{title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default async function Dashboard() {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    redirect("/sign-in");
  }

  const role = result.user?.role ?? "leader";
  const isAdmin = role === "admin";
  const isCoordinator = role === "coordinator";
  const statsResult = await getDashboardStats(result.session.userId, role);
  const stats = statsResult.ok ? statsResult.data : null;
  const metrics = [
    {
      label: "Total de eleitores",
      value: stats?.totalVoters,
      description: stats
        ? `${formatCountLabel(stats.recentVoters, "cadastro", "cadastros")} nos últimos 7 dias`
        : "Não foi possível carregar",
      href: "/dashboard/eleitores",
      icon: Users,
    },
    {
      label: "Cadastros recentes",
      value: stats?.recentVoters,
      description: "Movimentação dos últimos 7 dias",
      href: "/dashboard/eleitores",
      icon: BarChart3,
    },
    {
      label: "Campanhas ativas",
      value: stats?.activeCampaigns,
      description: "Abertas para cadastro",
      href: "/dashboard/campanhas",
      icon: Megaphone,
    },
    {
      label: isAdmin ? "Líderes ativos" : isCoordinator ? "Meus líderes" : "Links ativos",
      value: isAdmin || isCoordinator ? stats?.activeLeaders : stats?.activeLinks,
      description: isAdmin || isCoordinator ? "Com acesso ativo" : "Disponíveis para cadastro",
      href: isAdmin || isCoordinator ? "/dashboard/lideres" : "/dashboard/campanhas",
      icon: UserPlus,
    },
  ];

  return (
    <section className="min-h-full w-full bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Visão geral
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                {isAdmin ? "Painel administrativo" : isCoordinator ? "Painel do coordenador" : "Painel do líder"}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                {isAdmin
                  ? "Acompanhe o andamento das campanhas e mantenha os próximos passos sob controle."
                  : isCoordinator
                  ? "Acompanhe seus líderes, campanhas e cadastros do seu coordenadoramento."
                  : "Acompanhe suas campanhas e os cadastros recebidos pelos seus links."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {isAdmin ? (
                <>
                  <Button asChild>
                    <Link href="/dashboard/campanhas/nova">
                      <FilePlus2 aria-hidden="true" /> Nova campanha
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/dashboard/lideres/novo">
                      <UserPlus aria-hidden="true" /> Convidar líder
                    </Link>
                  </Button>
                </>
              ) : isCoordinator ? (
                <>
                  <Button asChild>
                    <Link href="/dashboard/lideres/novo">
                      <UserPlus aria-hidden="true" /> Convidar líder
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/dashboard/campanhas">
                      <ArrowUpRight aria-hidden="true" /> Ver campanhas
                    </Link>
                  </Button>
                </>
              ) : (
                <Button asChild>
                  <Link href="/dashboard/campanhas">
                    <ArrowUpRight aria-hidden="true" /> Ver meus links
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </header>

        {!stats && (
          <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between" role="alert">
            <span>{statsResult.ok ? "" : statsResult.message}</span>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">Atualizar dados</Link>
            </Button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(({ label, value, description, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className="group rounded-xl border bg-card p-5 shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:border-primary"
              aria-label={`${label}: ${value === undefined ? "indisponível" : formatNumber(value)}`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <ArrowUpRight
                  className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-6 text-sm font-medium text-muted-foreground">{label}</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                {value === undefined ? "-" : formatNumber(value)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{description}</p>
            </Link>
          ))}
        </div>

            {stats && (
            <>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)]">
              <Card className="gap-0 overflow-hidden">
                <CardHeader className="flex flex-row items-end justify-between gap-4 border-b pb-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      Acompanhamento
                    </p>
                    <h2 className="mt-2 text-lg font-semibold">Campanhas recentes</h2>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/dashboard/campanhas">
                      Ver todas <ArrowUpRight aria-hidden="true" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {stats.campaigns.length === 0 ? (
                    <div className="flex flex-col items-start gap-4 p-6">
                      <div>
                        <h3 className="font-medium">Nenhuma campanha ainda</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {isAdmin
                            ? "Crie sua primeira campanha para começar a receber cadastros."
                            : "Aguarde campanhas serem criadas e vinculadas aos seus líderes."}
                        </p>
                      </div>
                      {isAdmin && (
                        <Button asChild size="sm">
                          <Link href="/dashboard/campanhas/nova">Criar campanha</Link>
                        </Button>
                      )}
                    </div>
                  ) : (
                    stats.campaigns.map((campaign) => (
                      <CampaignRow key={campaign.id} campaign={campaign} />
                    ))
                  )}
                </CardContent>
              </Card>
              {(isAdmin || isCoordinator) && <AttentionPanel stats={stats} />}
            </div>

            <CampaignDistribution campaigns={stats.campaigns} />
          </>
        )}
      </div>
    </section>
  );
}
