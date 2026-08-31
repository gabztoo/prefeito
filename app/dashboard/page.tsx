import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  MailWarning,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  getDashboardStats,
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

function AttentionPanel({ stats }: { stats: DashboardStats }) {
  const attentionItems = [
    stats.pendingInvitations > 0 && {
      href: "/dashboard/lideres",
      icon: MailWarning,
      title: formatCountLabel(stats.pendingInvitations, "convite pendente", "convites pendentes"),
      description: "Aguardando aceite do líder",
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
          Itens que precisam da sua atenção.
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
      label: isAdmin ? "Líderes ativos" : isCoordinator ? "Meus líderes" : "Links ativos",
      value: isAdmin || isCoordinator ? stats?.activeLeaders : stats?.activeLinks,
      description: isAdmin || isCoordinator ? "Com acesso ativo" : "Disponíveis para cadastro",
      href: isAdmin || isCoordinator ? "/dashboard/lideres" : "/dashboard/eleitores",
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
                  ? "Acompanhe os cadastros e mantenha os próximos passos sob controle."
                  : isCoordinator
                  ? "Acompanhe seus líderes e cadastros do seu coordenadoramento."
                  : "Acompanhe os cadastros recebidos pelos seus links."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {isAdmin ? (
                <Button asChild className="bg-[#f59e0b] hover:bg-[#d97706] text-white">
                  <Link href="/dashboard/lideres/novo">
                    <UserPlus aria-hidden="true" /> Convidar líder
                  </Link>
                </Button>
              ) : isCoordinator ? (
                <Button asChild className="bg-[#f59e0b] hover:bg-[#d97706] text-white">
                  <Link href="/dashboard/lideres/novo">
                    <UserPlus aria-hidden="true" /> Convidar líder
                  </Link>
                </Button>
              ) : null}
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map(({ label, value, description, href, icon: Icon }, index) => {
            const borderColors = ["border-b-[#1e40af]", "border-b-[#06b6d4]", "border-b-[#f59e0b]"];
            return (
              <Link
                key={label}
                href={href}
                className={`group rounded-xl border bg-card p-5 shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md focus-visible:border-primary border-b-4 ${borderColors[index % 3]}`}
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
            );
          })}
        </div>

        {(isAdmin || isCoordinator) && stats && <AttentionPanel stats={stats} />}
      </div>
    </section>
  );
}
