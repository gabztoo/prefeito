import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { listLeadersWithVoters } from "@/lib/services/invitation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { LeaderActions } from "./leader-actions";
import { GenerateLinkDialog } from "./generate-link-dialog";
import { generateLeaderLinkAction } from "./actions";

export default async function LideresPage() {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    redirect("/sign-in");
  }

  if (result.user?.role !== "admin" && result.user?.role !== "coordinator") {
    redirect("/dashboard");
  }

  const leadersResult = result.user?.role === "coordinator"
    ? await listLeadersWithVoters(result.session.userId)
    : await listLeadersWithVoters();

  if (!leadersResult.ok) {
    return (
      <section className="flex flex-col items-start justify-start p-6 w-full">
        <div className="w-full">
          <h1 className="text-3xl font-semibold tracking-tight">Líderes</h1>
          <p className="text-muted-foreground mt-2">
            Erro ao carregar líderes: {leadersResult.message}
          </p>
        </div>
      </section>
    );
  }

  const { leaders, total } = leadersResult.data;

  const getStatusBadge = (banned: boolean, invitationStatus: string | null) => {
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
          <h1 className="text-3xl font-semibold tracking-tight">Líderes</h1>
          <p className="text-muted-foreground">
            {result.user?.role === "coordinator"
              ? "Gerencie os líderes do seu coordenadoramento"
              : "Gerencie os líderes do sistema"}
          </p>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {total} líder{total !== 1 ? "es" : ""} encontrado{total !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            <GenerateLinkDialog onGenerate={generateLeaderLinkAction} />
            <Link href="/dashboard/lideres/novo">
              <Button>Cadastrar</Button>
            </Link>
          </div>
        </div>

        {leaders.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                Nenhum líder encontrado. Convide líderes para começar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {leaders.map((leader) => (
              <Card key={leader.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-lg truncate">{leader.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {leader.email}
                      </p>
                    </div>
                    {getStatusBadge(leader.banned, leader.invitationStatus)}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                    {leader.cpf && (
                      <div>
                        <span className="text-muted-foreground">CPF: </span>
                        <span>{leader.cpf}</span>
                      </div>
                    )}
                    {leader.cep && (
                      <div>
                        <span className="text-muted-foreground">CEP: </span>
                        <span>{leader.cep}</span>
                      </div>
                    )}
                    {leader.voterTitle && (
                      <div>
                        <span className="text-muted-foreground">Título: </span>
                        <span>{leader.voterTitle}</span>
                      </div>
                    )}
                    {leader.zone && (
                      <div>
                        <span className="text-muted-foreground">Zona: </span>
                        <span>{leader.zone}</span>
                      </div>
                    )}
                    {leader.section && (
                      <div>
                        <span className="text-muted-foreground">Seção: </span>
                        <span>{leader.section}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Eleitores: </span>
                      <span>{leader.voters.length}</span>
                    </div>
                  </div>
                  {leader.cep && (
                    <div className="text-sm mb-2">
                      <span className="text-muted-foreground">CEP: </span>
                      <span>{leader.cep}</span>
                    </div>
                  )}
                  {leader.address && (
                    <div className="text-sm mb-4">
                      <span className="text-muted-foreground">Endereço: </span>
                      <span>{leader.address}</span>
                    </div>
                  )}
                  {leader.localAtuacao && (
                    <div className="text-sm mb-4">
                      <span className="text-muted-foreground">Local de Atuação: </span>
                      <span>{leader.localAtuacao}</span>
                    </div>
                  )}

                  {leader.voters.length > 0 && (
                    <div className="mt-auto">
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        Eleitores vinculados
                      </p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {leader.voters.map((voter) => (
                          <div
                            key={voter.id}
                            className="p-3 rounded-lg border bg-muted/30"
                          >
                            <p className="font-medium text-sm truncate">{voter.name}</p>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                              {voter.cpf && (
                                <div>
                                  <span>CPF: </span>
                                  <span>{voter.cpf}</span>
                                </div>
                              )}
                              {voter.voterTitle && (
                                <div>
                                  <span>Título: </span>
                                  <span>{voter.voterTitle}</span>
                                </div>
                              )}
                              <div>
                                <span>Zona: </span>
                                <span>{voter.zone}</span>
                              </div>
                              <div>
                                <span>Seção: </span>
                                <span>{voter.section}</span>
                              </div>
                              {voter.phone && (
                                <div>
                                  <span>Tel: </span>
                                  <span>
                                    {voter.phone.replace(
                                      /(\d{2})(\d{5})(\d{4})/,
                                      "($1) $2-$3"
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end mt-4 pt-3 border-t">
                    <LeaderActions leaderId={leader.id} disabled={leader.banned} isAdmin={result.user?.role === "admin"} />
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
