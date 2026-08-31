import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { listCoordinatorsWithHierarchy } from "@/lib/services/invitation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { CoordenadorActions } from "./coordenador-actions";
import { GenerateLinkDialog } from "./generate-link-dialog";
import { generateCoordinatorLinkAction } from "./actions";

export default async function CoordenadoresPage() {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    redirect("/sign-in");
  }

  if (result.user?.role !== "admin") {
    redirect("/dashboard");
  }

  const coordinatorsResult = await listCoordinatorsWithHierarchy();

  if (!coordinatorsResult.ok) {
    return (
      <section className="flex flex-col items-start justify-start p-6 w-full">
        <div className="w-full">
          <h1 className="text-3xl font-semibold tracking-tight">
            Coordenadores
          </h1>
          <p className="text-muted-foreground mt-2">
            Erro ao carregar coordenadores: {coordinatorsResult.message}
          </p>
        </div>
      </section>
    );
  }

  const { coordinators, total } = coordinatorsResult.data;

  const getStatusBadge = (
    banned: boolean,
    invitationStatus: string | null
  ) => {
    if (banned) {
      return <Badge variant="destructive">Desativado</Badge>;
    }
    if (invitationStatus === "pending") {
      return <Badge variant="outline">Pendente</Badge>;
    }
    if (invitationStatus === "accepted") {
      return <Badge variant="default">Ativo</Badge>;
    }
    return <Badge variant="secondary">Sem convite</Badge>;
  };

  return (
    <section className="flex flex-col items-start justify-start p-6 w-full">
      <div className="w-full">
        <div className="flex flex-col items-start justify-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Coordenadores
          </h1>
          <p className="text-muted-foreground">
            Gerencie os coordenadores do sistema
          </p>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {total} coordenador{total !== 1 ? "es" : ""} encontrado
            {total !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            <GenerateLinkDialog onGenerate={generateCoordinatorLinkAction} />
            <Link href="/dashboard/coordenadores/novo">
              <Button>Novo Convite</Button>
            </Link>
          </div>
        </div>

        {coordinators.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                Nenhum coordenador encontrado. Convide coordenadores para
                começar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {coordinators.map((coordinator) => (
              <Card key={coordinator.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg truncate">
                        {coordinator.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {coordinator.email}
                      </p>
                    </div>
                    {getStatusBadge(
                      coordinator.banned,
                      coordinator.invitationStatus
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                    {coordinator.cpf && (
                      <div>
                        <span className="text-muted-foreground">CPF: </span>
                        <span>{coordinator.cpf}</span>
                      </div>
                    )}
                    {coordinator.zone && (
                      <div>
                        <span className="text-muted-foreground">Zona: </span>
                        <span>{coordinator.zone}</span>
                      </div>
                    )}
                    {coordinator.section && (
                      <div>
                        <span className="text-muted-foreground">Seção: </span>
                        <span>{coordinator.section}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Líderes: </span>
                      <span>{coordinator.leaders.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Eleitores: </span>
                      <span>
                        {coordinator.leaders.reduce(
                          (sum, l) => sum + l.voterCount,
                          0
                        )}
                      </span>
                    </div>
                  </div>

                  {coordinator.leaders.length > 0 && (
                    <div className="mt-auto">
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        Líderes vinculados
                      </p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {coordinator.leaders.map((leader) => (
                          <div
                            key={leader.id}
                            className="p-3 rounded-lg border bg-muted/30"
                          >
                            <div className="flex justify-between items-start mb-1">
                              <p className="font-medium text-sm truncate">
                                {leader.name}
                              </p>
                              <Badge
                                variant={leader.banned ? "destructive" : "default"}
                                className="ml-2 shrink-0 text-xs"
                              >
                                {leader.banned ? "Desativado" : "Ativo"}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              {leader.cpf && (
                                <div>
                                  <span>CPF: </span>
                                  <span>{leader.cpf}</span>
                                </div>
                              )}
                              {leader.zone && (
                                <div>
                                  <span>Zona: </span>
                                  <span>{leader.zone}</span>
                                </div>
                              )}
                              {leader.section && (
                                <div>
                                  <span>Seção: </span>
                                  <span>{leader.section}</span>
                                </div>
                              )}
                              <div>
                                <span>Eleitores: </span>
                                <span>{leader.voterCount}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end mt-4 pt-3 border-t">
                    <CoordenadorActions
                      coordinatorId={coordinator.id}
                      disabled={coordinator.banned}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
