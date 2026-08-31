"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { deleteVoterAction, editVoterAction } from "./actions";
import { PencilIcon, TrashIcon, LoaderIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Voter {
  id: string;
  name: string;
  zone: string;
  section: string;
  phone: string;
  voterTitle: string | null;
  campaignId: string | null;
  campaignLeaderId: string | null;
  leaderName: string | null;
  createdAt: Date;
}

interface VotersTableProps {
  voters: Voter[];
  isAdmin: boolean;
}

function EditVoterDialog({ voter }: { voter: Voter }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: voter.name,
    zone: voter.zone,
    section: voter.section,
    phone: voter.phone,
  });

  function openEditor() {
    setFormData({
      name: voter.name,
      zone: voter.zone,
      section: voter.section,
      phone: voter.phone,
    });
    setError(null);
    setOpen(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await editVoterAction(voter.id, formData);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOpen(false);
      window.location.reload();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={openEditor}
        aria-label={`Editar eleitor ${voter.name}`}
      >
        <PencilIcon className="size-4" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar eleitor</DialogTitle>
          <DialogDescription>Atualize os dados do eleitor cadastrado.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor={`edit-name-${voter.id}`}>Nome completo</Label>
            <Input
              id={`edit-name-${voter.id}`}
              value={formData.name}
              onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-zone-${voter.id}`}>Zona</Label>
              <Input
                id={`edit-zone-${voter.id}`}
                value={formData.zone}
                onChange={(event) => setFormData({ ...formData, zone: event.target.value })}
                inputMode="numeric"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-section-${voter.id}`}>Seção</Label>
              <Input
                id={`edit-section-${voter.id}`}
                value={formData.section}
                onChange={(event) => setFormData({ ...formData, section: event.target.value })}
                inputMode="numeric"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-phone-${voter.id}`}>Telefone</Label>
            <Input
              id={`edit-phone-${voter.id}`}
              value={formData.phone}
              onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
              inputMode="tel"
              required
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function VotersTable({ voters, isAdmin }: VotersTableProps) {
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
    <div className="mt-4 overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3">Nome</th>
            <th className="hidden px-4 py-3 md:table-cell">Telefone</th>
            <th className="hidden px-4 py-3 lg:table-cell">Título</th>
            <th className="hidden px-4 py-3 sm:table-cell">Zona</th>
            <th className="hidden px-4 py-3 sm:table-cell">Seção</th>
            <th className="hidden px-4 py-3 md:table-cell">Cadastro</th>
            <th className="hidden px-4 py-3 xl:table-cell">Líder</th>
            {isAdmin && <th className="px-4 py-3 text-right">Ações</th>}
          </tr>
        </thead>
        <tbody>
          {voters.map((voter) => (
            <tr key={voter.id} className="border-b last:border-b-0 hover:bg-muted/30">
              <td className="px-4 py-3 font-medium">{voter.name}</td>
              <td className="hidden px-4 py-3 md:table-cell">
                {voter.phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}
              </td>
              <td className="hidden px-4 py-3 lg:table-cell">{voter.voterTitle || "-"}</td>
              <td className="hidden px-4 py-3 sm:table-cell">{voter.zone}</td>
              <td className="hidden px-4 py-3 sm:table-cell">{voter.section}</td>
              <td className="hidden px-4 py-3 md:table-cell">
                {new Date(voter.createdAt).toLocaleDateString("pt-BR")}
              </td>
              <td className="hidden px-4 py-3 xl:table-cell">
                {voter.leaderName ? (
                  <span className="text-[#f59e0b] font-medium">{voter.leaderName}</span>
                ) : (
                  "-"
                )}
              </td>
              {isAdmin && (
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <EditVoterDialog voter={voter} />
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
  );
}
