"use client";

import Link from "next/link";
import { useState } from "react";
import { requestPasswordReset } from "./actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setError(null);
    setIsLoading(true);

    try {
      const result = await requestPasswordReset(email);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setStatus(
        "Se o e-mail estiver cadastrado, enviaremos um link para redefinir sua senha."
      );
    } catch {
      setError("Não foi possível solicitar a redefinição. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-lg md:text-xl">Esqueci minha senha</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Informe seu e-mail para receber as instruções de recuperação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div
              aria-atomic="true"
              aria-live="polite"
              className="min-h-5 text-sm text-green-700"
              role="status"
            >
              {status}
            </div>

            {error && (
              <Alert id="reset-request-error" variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "reset-request-error" : undefined}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              Solicitar redefinição
            </Button>

            <p className="text-center text-sm">
              <Link
                href="/sign-in"
                className="text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Voltar para o login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
