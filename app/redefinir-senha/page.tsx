import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { completePasswordReset } from "@/app/esqueci-senha/actions";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/services/invitation";
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

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Redefinir senha",
  referrer: "no-referrer",
  other: {
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
  },
};

type ResetPageProps = {
  searchParams: Promise<{
    token?: string | string[];
    error?: string | string[];
  }>;
};

function getFirstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function getErrorMessage(error: string, hasToken: boolean): string | null {
  if (!hasToken) {
    return "O link de redefinição é inválido ou expirou.";
  }

  if (error === "VALIDATION_ERROR") {
    return "A senha deve ter entre 12 e 128 caracteres e as duas senhas devem coincidir.";
  }

  if (error === "NOT_FOUND") {
    return "O link de redefinição é inválido ou expirou.";
  }

  return error ? "Não foi possível redefinir sua senha. Solicite um novo link." : null;
}

export default async function RedefinirSenhaPage({
  searchParams,
}: ResetPageProps) {
  const params = await searchParams;
  const token = getFirstParam(params.token);
  const errorMessage = getErrorMessage(getFirstParam(params.error), Boolean(token));

  async function submitReset(formData: FormData) {
    "use server";

    const submittedToken = formData.get("token");
    const newPassword = formData.get("newPassword");
    const confirmation = formData.get("confirmation");

    if (
      typeof submittedToken !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmation !== "string" ||
      submittedToken.length === 0
    ) {
      redirect("/redefinir-senha?error=VALIDATION_ERROR");
    }

    if (newPassword !== confirmation) {
      redirect(
        `/redefinir-senha?token=${encodeURIComponent(submittedToken)}&error=VALIDATION_ERROR`
      );
    }

    const result = await completePasswordReset({
      token: submittedToken,
      newPassword,
    });

    if (!result.ok) {
      const nextToken = result.code === "VALIDATION_ERROR"
        ? `&token=${encodeURIComponent(submittedToken)}`
        : "";
      redirect(`/redefinir-senha?error=${result.code}${nextToken}`);
    }

    redirect("/sign-in?reset=success");
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-lg md:text-xl">Redefinir senha</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Escolha uma nova senha para acessar sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={submitReset} className="space-y-4">
            <p
              id="password-help"
              aria-atomic="true"
              aria-live="polite"
              className="min-h-5 text-sm"
              role="status"
            >
              {!errorMessage && "Sua senha deve ter entre 12 e 128 caracteres."}
            </p>

            {errorMessage && (
              <Alert id="reset-password-error" variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="token" className="sr-only">
                Token de redefinição
              </Label>
              <Input
                id="token"
                name="token"
                type="hidden"
                value={token}
                readOnly
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova senha</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
                required
                aria-describedby="password-help"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmation">Confirmar nova senha</Label>
              <Input
                id="confirmation"
                name="confirmation"
                type="password"
                autoComplete="new-password"
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
                required
                aria-describedby="password-help"
              />
            </div>

            <Button type="submit" className="w-full">
              Redefinir senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
