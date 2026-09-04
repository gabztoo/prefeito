"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createVoterAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

export default function NovoEleitorPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [phone, setPhone] = useState("");
  const [zone, setZone] = useState("");
  const [section, setSection] = useState("");
  const [voterTitle, setVoterTitle] = useState("");
  const [cep, setCep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCepBlur = useCallback(async (value: string) => {
    const cleanCep = value.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cleanCep}/json/`
      );
      const data = await response.json();

      if (!data.erro) {
        setCep(`${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`);
      }
    } catch {
      // Silently fail for CEP lookup
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await createVoterAction({
        name,
        motherName,
        phone,
        zone,
        section,
        voterTitle: voterTitle || undefined,
        cep: cep || undefined,
      });

      if (result.ok) {
        setSuccess(true);
      } else {
        setError(result.message);
      }
    } catch {
      setError("Erro ao cadastrar eleitor. Tente novamente.");
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
              Eleitor cadastrado com sucesso!
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex gap-2">
            <Link href="/dashboard/eleitores">
              <Button>Voltar para Eleitores</Button>
            </Link>
            <Button variant="outline" onClick={() => {
              setSuccess(false);
              setName("");
              setMotherName("");
              setPhone("");
              setZone("");
              setSection("");
              setVoterTitle("");
              setCep("");
            }}>
              Cadastrar outro
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col items-start justify-start p-6 w-full">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard/eleitores">
            <Button variant="outline" size="sm">
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">
            Novo Eleitor
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cadastrar eleitor</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  placeholder="Nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="motherName">Nome da Mãe</Label>
                <Input
                  id="motherName"
                  placeholder="Nome completo da mãe"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (com DDD)</Label>
                <Input
                  id="phone"
                  placeholder="00000000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zone">Zona</Label>
                  <Input
                    id="zone"
                    placeholder="000"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section">Seção</Label>
                  <Input
                    id="section"
                    placeholder="000"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="voterTitle">Título de eleitor (opcional)</Label>
                <Input
                  id="voterTitle"
                  placeholder="000000000000"
                  maxLength={12}
                  value={voterTitle}
                  onChange={(e) => setVoterTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cep">CEP (opcional)</Label>
                <Input
                  id="cep"
                  placeholder="00000000"
                  maxLength={8}
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  onBlur={(e) => handleCepBlur(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Cadastrando..." : "Cadastrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
