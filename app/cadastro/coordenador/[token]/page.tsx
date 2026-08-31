import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CoordinatorRegistrationForm } from "./registration-form";
import { getRegistrationToken } from "@/lib/services/registration";
import Image from "next/image";

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function PublicCoordinatorRegistrationPage({ params }: PageProps) {
  const { token } = await params;
  const tokenResult = await getRegistrationToken(token);

  if (!tokenResult.ok) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Link indisponível</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{tokenResult.message}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const tokenData = tokenResult.data;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Image
              src="/wbranco.jpeg"
              alt="Logo"
              width={140}
              height={50}
              className="object-contain"
            />
          </div>
          <CardTitle className="text-2xl">Cadastro de Coordenador</CardTitle>
          <CardDescription>
            Convite de: <span className="text-[#1e40af] font-medium">{tokenData.inviterName}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            O sistema irá gerar um email e usuário para acessar o sistema após o cadastro.
          </p>
          <CoordinatorRegistrationForm token={token} />
        </CardContent>
      </Card>
    </main>
  );
}
