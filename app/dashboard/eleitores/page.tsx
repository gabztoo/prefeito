import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { listVotersAction, getVoterStatsAction } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VotersTable } from "./voters-table";
import { VotersFilters } from "./voters-filters";
import { VotersPagination } from "./voters-pagination";

interface SearchParams {
  leaderId?: string;
  zone?: string;
  section?: string;
  search?: string;
  page?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

export default async function EleitoresPage({ searchParams }: Props) {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);

  const filters = {
    leaderId: params.leaderId,
    zone: params.zone,
    section: params.section,
    search: params.search,
    page,
    limit: 25,
  };

  const [votersResult, statsResult] = await Promise.all([
    listVotersAction(filters),
    getVoterStatsAction(),
  ]);

  const isAdmin = result.user?.role === "admin";

  return (
    <section className="flex flex-col items-start justify-start p-4 sm:p-6 w-full">
      <div className="w-full">
        <div className="flex flex-col items-start justify-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Eleitores</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {isAdmin
              ? "Gerencie todos os eleitores cadastrados"
              : "Veja seus eleitores cadastrados"}
          </p>
        </div>

        {statsResult.ok && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Total de Eleitores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">
                  {statsResult.data.grandTotal.toLocaleString("pt-BR")}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <VotersFilters />

        {votersResult.ok ? (
          <>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {votersResult.data.totalFiltered.toLocaleString("pt-BR")} eleitor
                {votersResult.data.totalFiltered !== 1 ? "es" : ""} encontrado
                {votersResult.data.totalFiltered !== 1 ? "s" : ""}
              </p>
            </div>

            {votersResult.data.voters.length === 0 ? (
              <Card className="mt-4">
                <CardContent className="pt-6">
                  <p className="text-muted-foreground text-center">
                    Nenhum eleitor encontrado.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <VotersTable
                voters={votersResult.data.voters}
                isAdmin={isAdmin}
              />
            )}

            <VotersPagination
              total={votersResult.data.totalFiltered}
              page={page}
              limit={votersResult.data.limit}
            />
          </>
        ) : (
          <Card className="mt-4">
            <CardContent className="pt-6">
              <p className="text-destructive text-center">
                Erro ao carregar eleitores: {votersResult.message}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
