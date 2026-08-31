"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
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
import Link from "next/link";
import Image from "next/image";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default function SignIn() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const isEmail = login.includes("@");
      const result = isEmail
        ? await signIn.email({ email: login, password })
        : await signIn.username({ username: login, password });

      if (result?.error) {
        setError("Credenciais inválidas. Verifique seu usuário e senha.");
      } else {
        const requiresPasswordChange = (
          result.data?.user as { mustChangePassword?: boolean } | undefined
        )?.mustChangePassword;

        if (requiresPasswordChange) {
          router.push("/alterar-senha");
        } else {
          router.push("/dashboard");
        }
        router.refresh();
      }
    } catch {
      setError("Erro ao fazer login. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex flex-col justify-center items-center w-full min-h-screen bg-[#fafaf9] p-4">
      <Card className="max-w-md w-full shadow-lg border-[#d6d3d1]">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <Image
              src="/hermes.jpg"
              alt="Hermes"
              width={64}
              height={64}
              className="rounded-lg object-cover"
            />
          </div>
          <CardTitle className="text-lg md:text-xl">
            Hermes Sistema Eleitoral
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Acesse o painel administrativo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="login">E-mail ou Usuário</Label>
              <Input
                id="login"
                name="login"
                type="text"
                placeholder="seu@email.com ou nome_usuario"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="text-right text-sm">
              <Link
                href="/esqueci-senha"
                className="text-[#374151] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Esqueci minha senha
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground mb-2">Desenvolvido por</p>
        <div className="flex items-center justify-center gap-4">
          <a
            href="https://www.instagram.com/sugiiartz?igsi=dXEyeHo4cDhoZjNn"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-[#374151] flex items-center gap-1 text-xs duration-150"
          >
            <InstagramIcon className="h-3 w-3" />
            <span>@sugiiartz</span>
          </a>
          <a
            href="https://www.instagram.com/gabztoo?igsi=OWJvZDQ3M21qbHE1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-[#374151] flex items-center gap-1 text-xs duration-150"
          >
            <InstagramIcon className="h-3 w-3" />
            <span>@macae092</span>
          </a>
        </div>
      </div>
    </main>
  );
}
