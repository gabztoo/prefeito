"use client";

import { useState, useCallback } from "react";
import { inviteCoordinatorAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { formatCpf } from "@/lib/services/cpf";

export default function NovoCoordenadorPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rg, setRg] = useState("");
  const [cpf, setCpf] = useState("");
  const [address, setAddress] = useState("");
  const [cep, setCep] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [voterTitle, setVoterTitle] = useState("");
  const [zone, setZone] = useState("");
  const [section, setSection] = useState("");
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

  const handleCepChange = useCallback(async (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    setCep(digits);
    if (digits.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setAddress(`${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}, `);
        }
      } catch {}
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await inviteCoordinatorAction({
        firstName,
        lastName,
        rg,
        cpf,
        address,
        cep,
        imageUrl,
        voterTitle,
        zone,
        section,
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
              <strong>Email:</strong> {login}@prefeito.local
              <br />
              <strong>Senha padrão:</strong> 12345678
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex gap-2">
            <Link href="/dashboard/coordenadores">
              <Button>Voltar para Coordenadores</Button>
            </Link>
            <Link href="/sign-in">
              <Button variant="outline">Ir para o login</Button>
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
            Novo Coordenador
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cadastrar novo coordenador</CardTitle>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rg">RG</Label>
                  <Input
                    id="rg"
                    placeholder="12.345.678-9"
                    value={rg}
                    onChange={(e) => setRg(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    placeholder="123.456.789-00"
                    value={cpf ? formatCpf(cpf) : ""}
                    onChange={(e) =>
                      setCpf(e.target.value.replace(/\D/g, "").slice(0, 11))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    placeholder="00000-000"
                    value={cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    maxLength={8}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    placeholder="Rua, número, bairro, cidade - UF"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">URL da Selfie</Label>
                <Input
                  id="imageUrl"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
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

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="voterTitle">Título de Eleitor</Label>
                  <Input
                    id="voterTitle"
                    placeholder="123456789012"
                    value={voterTitle}
                    onChange={(e) => setVoterTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zone">Zona</Label>
                  <Input
                    id="zone"
                    placeholder="0123"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section">Seção</Label>
                  <Input
                    id="section"
                    placeholder="0456"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                  />
                </div>
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
