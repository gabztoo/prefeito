"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { User, Lock } from "lucide-react";
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
    <main
      className="flex flex-col justify-center items-center w-full min-h-screen bg-white p-4"
    >
      <Card className="max-w-sm w-full shadow-xl border-0 rounded-xl">
        <CardHeader className="text-center space-y-3 pt-6">
          <div className="flex justify-center">
            <Image
              src="/logowl.png"
              alt="Logo"
              width={180}
              height={70}
              className="object-contain"
            />
          </div>
          <CardTitle className="text-xl font-bold text-gray-800">
            Acesso Restrito
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="login" className="text-sm font-medium text-gray-700">
                E-mail ou Usuário
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="login"
                  name="login"
                  type="text"
                  placeholder="E-mail ou Usuário"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  required
                  autoComplete="username"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer text-gray-600">
                <input type="checkbox" className="rounded border-gray-300" />
                Lembrar-me
              </label>
              <Link
                href="/esqueci-senha"
                className="text-[#1e40af] hover:underline font-medium"
              >
                Esqueceu a senha?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-white font-semibold py-2.5 rounded-lg text-sm cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "ENTRAR NO SISTEMA"}
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-gray-100 text-center">
            <p className="text-[11px] text-gray-400 mb-1.5">Desenvolvido por</p>
            <div className="flex items-center justify-center gap-3">
              <a
                href="https://www.instagram.com/sugiiartz?igsi=dXEyeHo4cDhoZjNn"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-[11px] duration-150"
              >
                <InstagramIcon className="h-3 w-3" />
                <span>sugiiartz</span>
              </a>
              <a
                href="https://www.instagram.com/gabztoo?igsi=OWJvZDQ3M21qbHE1"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-[11px] duration-150"
              >
                <InstagramIcon className="h-3 w-3" />
                <span>macae092</span>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
