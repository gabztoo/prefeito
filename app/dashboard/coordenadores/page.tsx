import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { listCoordinatorsWithHierarchy } from "@/lib/services/invitation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
        <div className="mt-6 grid gap-4">
          {coordinators.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">
                  Nenhum coordenador encontrado. Convide coordenadores para
                  começar.
                </p>
              </CardContent>
            </Card>
          ) : (
            coordinators.map((coordinator) => (
              <Card key={coordinator.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {coordinator.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {coordinator.email}
                      </p>
                    </div>
                    {getStatusBadge(
                      coordinator.banned,
                      coordinator.invitationStatus
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-4">
                    {coordinator.cpf && <span>CPF: {coordinator.cpf}</span>}
                    {coordinator.zone && <span>Zona: {coordinator.zone}</span>}
                    {coordinator.section && <span>Seção: {coordinator.section}</span>}
                    <span>
                      Líderes: {coordinator.leaders.length}
                    </span>
                    <span>
                      Total de eleitores: {coordinator.leaders.reduce((sum, l) => sum + l.voterCount, 0)}
                    </span>
                  </div>

                  {coordinator.leaders.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="leaders">
                        <AccordionTrigger className="text-sm">
                          Ver líderes vinculados ({coordinator.leaders.length})
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid gap-3 mt-2">
                            {coordinator.leaders.map((leader) => (
                              <div
                                key={leader.id}
                                className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                              >
                                <div>
                                  <p className="font-medium text-sm">{leader.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {leader.email}
                                  </p>
                                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                                    {leader.cpf && <span>CPF: {leader.cpf}</span>}
                                    {leader.zone && <span>Zona: {leader.zone}</span>}
                                    {leader.section && <span>Seção: {leader.section}</span>}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge variant={leader.banned ? "destructive" : "default"}>
                                    {leader.banned ? "Desativado" : "Ativo"}
                                  </Badge>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {leader.voterCount} eleitor{leader.voterCount !== 1 ? "es" : ""}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhum líder vinculado
                    </p>
                  )}

                  <div className="flex justify-end mt-4">
                    <CoordenadorActions
                      coordinatorId={coordinator.id}
                      disabled={coordinator.banned}
                    />
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
