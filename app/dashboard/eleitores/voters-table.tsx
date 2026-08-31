"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  campaignId: string;
  campaignLeaderId: string;
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
    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {voters.map((voter) => (
        <Card key={voter.id} className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg truncate">{voter.name}</CardTitle>
              </div>
              {isAdmin && (
                <div className="flex gap-1 shrink-0 ml-2">
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
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Telefone: </span>
                <span>
                  {voter.phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Zona: </span>
                <span>{voter.zone}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Seção: </span>
                <span>{voter.section}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cadastro: </span>
                <span>{new Date(voter.createdAt).toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
