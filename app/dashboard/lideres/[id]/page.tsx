import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, UsersIcon } from "lucide-react";
import { listVotersByLeader } from "@/lib/services/voter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VotersTable } from "@/app/dashboard/eleitores/voters-table";
import { VotersPagination } from "@/app/dashboard/eleitores/voters-pagination";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function LeaderVotersPage({ params, searchParams }: Props) {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    redirect("/sign-in");
  }

  const role = result.user?.role ?? "leader";

  if (role === "leader") {
    redirect("/dashboard/eleitores");
  }

  if (role !== "admin" && role !== "coordinator") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const query = await searchParams;
  const page = parseInt(query.page || "1", 10);

  const votersResult = await listVotersByLeader(id, result.session.userId, role, {
    page,
    limit: 25,
  });

  if (!votersResult.ok) {
    if (votersResult.code === "FORBIDDEN") {
      redirect("/dashboard/lideres");
    }

    return (
      <section className="flex flex-col items-start justify-start p-6 w-full">
        <div className="w-full">
          <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
            <Link href="/dashboard/lideres">
              <ArrowLeftIcon className="mr-2 size-4" />
              Voltar para líderes
            </Link>
          </Button>
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive text-center">
                {votersResult.message}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  const { leader, voters, total, limit } = votersResult.data;
  const isAdmin = role === "admin";

  return (
    <section className="flex flex-col items-start justify-start p-4 sm:p-6 w-full">
      <div className="w-full">
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link href="/dashboard/lideres">
            <ArrowLeftIcon className="mr-2 size-4" />
            Voltar para líderes
          </Link>
        </Button>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-2xl truncate">{leader.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {leader.email}
                </p>
                {leader.coordinatorName && (
                  <p className="text-sm mt-1 truncate">
                    <span className="text-muted-foreground">Coordenador: </span>
                    <span className="text-[#f59e0b] font-medium">
                      {leader.coordinatorName}
                    </span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={leader.banned ? "destructive" : "default"}>
                  {leader.banned ? "Desativado" : "Ativo"}
                </Badge>
                <Badge variant="secondary">
                  <UsersIcon className="mr-1 size-3" />
                  {total.toLocaleString("pt-BR")} eleitor{total !== 1 ? "es" : ""}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="mt-6">
          <h2 className="text-lg font-semibold tracking-tight">
            Eleitores de {leader.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Todos os eleitores vinculados a este líder."
              : "Somente os eleitores vinculados a este líder do seu coordenadoramento."}
          </p>
        </div>

        {voters.length === 0 ? (
          <Card className="mt-4">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                Este líder ainda não possui eleitores cadastrados.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <VotersTable voters={voters} isAdmin={isAdmin} />
            <VotersPagination
              total={total}
              page={page}
              limit={limit}
              basePath={`/dashboard/lideres/${leader.id}`}
            />
          </>
        )}
      </div>
    </section>
  );
}
