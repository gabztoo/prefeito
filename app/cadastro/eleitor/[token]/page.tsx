import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getRegistrationToken } from "@/lib/services/registration";
import { notFound } from "next/navigation";
import { VoterRegistrationForm } from "./registration-form";
import Image from "next/image";

export default async function CadastroEleitorPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const tokenResult = await getRegistrationToken(token);

  if (!tokenResult.ok || tokenResult.data.role !== "voter") {
    notFound();
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
          <CardTitle className="text-2xl">Cadastro de Eleitor</CardTitle>
          <CardDescription>
            Convite de: <span className="text-[#1e40af] font-medium">{tokenData.inviterName}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VoterRegistrationForm token={token} />
        </CardContent>
      </Card>
    </main>
  );
}
