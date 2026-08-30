"use client";

import { useState } from "react";
import { inviteCoordinatorAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

export default function NovoCoordenadorPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [login, setLogin] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const generateLogin = (first: string, last: string) => {
    if (first && last) {
      return `${first}_${last}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9_]/g, "");
    }
    return "";
  };

  const handleNameChange = (first: string, last: string) => {
    setFirstName(first);
    setLastName(last);
    setLogin(generateLogin(first, last));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await inviteCoordinatorAction({
        firstName,
        lastName,
      });

      if (result.ok) {
        setSuccess(true);
      } else {
        setError(result.message);
      }
    } catch {
      setError("Erro ao convidar coordenador. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <section className="flex flex-col items-start justify-start p-6 w-full">
        <div className="w-full max-w-2xl">
          <Alert className="border-green-500 bg-green-50">
            <AlertDescription className="text-green-800">
              Coordenador criado com sucesso!
              <br />
              <strong>Login:</strong> {login}
              <br />
              <strong>Senha padrão:</strong> 12345678
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Link href="/dashboard/coordenadores">
              <Button>Voltar para Coordenadores</Button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col items-start justify-start p-6 w-full">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/coordenadores">
            <Button variant="outline" size="sm">
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">
            Novo Convite
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Convidar novo coordenador</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input
                    id="firstName"
                    placeholder="João"
                    value={firstName}
                    onChange={(e) =>
                      handleNameChange(e.target.value, lastName)
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Sobrenome</Label>
                  <Input
                    id="lastName"
                    placeholder="Silva"
                    value={lastName}
                    onChange={(e) =>
                      handleNameChange(firstName, e.target.value)
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login">Login (gerado automaticamente)</Label>
                <Input
                  id="login"
                  value={login}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label>Senha padrão</Label>
                <Input
                  value="12345678"
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  O coordenador fará login com esta senha e deverá alterá-la no
                  primeiro acesso.
                </p>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Criando..." : "Criar Coordenador"}
                </Button>
                <Link href="/dashboard/coordenadores">
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
