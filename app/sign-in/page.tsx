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
      className="flex flex-col justify-center items-center w-full min-h-screen bg-cover bg-center bg-no-repeat p-4"
      style={{ backgroundImage: "url('/bglogin.jpeg')" }}
    >
      <Card className="max-w-sm w-full shadow-xl border-0 rounded-xl">
        <CardHeader className="text-center space-y-2 pt-6">
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
        </CardContent>
      </Card>
    </main>
  );
}
