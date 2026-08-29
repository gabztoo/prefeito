"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteVoterAction } from "./actions";
import { PencilIcon, TrashIcon, LoaderIcon } from "lucide-react";

interface Voter {
  id: string;
  name: string;
  zone: string;
  section: string;
  phone: string;
  campaignId: string;
  campaignLeaderId: string;
  createdAt: Date;
}

interface VotersTableProps {
  voters: Voter[];
  isAdmin: boolean;
  currentPage: number;
}

export function VotersTable({ voters, isAdmin, currentPage }: VotersTableProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (voterId: string) => {
    if (!confirm("Tem certeza que deseja excluir este eleitor?")) return;

    startTransition(async () => {
      const result = await deleteVoterAction(voterId);
      if (result.ok) {
        window.location.reload();
      } else {
        alert(result.message);
      }
    });
  };

  return (
    <>
      <div className="hidden md:block">
        <Card className="mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table role="table" aria-label="Lista de eleitores" className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left font-medium p-3" scope="col">Nome</th>
                  <th className="text-left font-medium p-3" scope="col">Telefone</th>
                  <th className="text-left font-medium p-3" scope="col">Zona</th>
                  <th className="text-left font-medium p-3" scope="col">Seção</th>
                  <th className="text-left font-medium p-3" scope="col">Data</th>
                  {isAdmin && <th className="text-right font-medium p-3" scope="col">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {voters.map((voter) => (
                  <tr key={voter.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">{voter.name}</td>
                    <td className="p-3">
                      {voter.phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}
                    </td>
                    <td className="p-3">{voter.zone}</td>
                    <td className="p-3">{voter.section}</td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(voter.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    {isAdmin && (
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" disabled aria-label="Editar eleitor">
                            <PencilIcon className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(voter.id)}
                            disabled={isPending}
                            className="text-destructive hover:text-destructive"
                            aria-label={`Excluir eleitor ${voter.name}`}
                          >
                            {isPending ? (
                              <LoaderIcon className="size-4 animate-spin" />
                            ) : (
                              <TrashIcon className="size-4" />
                            )}
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="md:hidden space-y-3 mt-4" role="list" aria-label="Lista de eleitores">
        {voters.map((voter) => (
          <Card key={voter.id} role="listitem">
            <CardContent className="pt-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{voter.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {voter.phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" disabled className="size-9" aria-label="Editar eleitor">
                      <PencilIcon className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(voter.id)}
                      disabled={isPending}
                      className="size-9 text-destructive hover:text-destructive"
                      aria-label={`Excluir eleitor ${voter.name}`}
                    >
                      {isPending ? (
                        <LoaderIcon className="size-4 animate-spin" />
                      ) : (
                        <TrashIcon className="size-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Zona: </span>
                  <span>{voter.zone}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Seção: </span>
                  <span>{voter.section}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Data: </span>
                  <span>{new Date(voter.createdAt).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
