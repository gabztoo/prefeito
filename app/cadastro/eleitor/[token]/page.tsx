import { getRegistrationToken } from "@/lib/services/registration";
import { notFound } from "next/navigation";
import { VoterRegistrationForm } from "./registration-form";

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

  return (
    <section className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Cadastro de Eleitor
          </h1>
          <p className="text-muted-foreground mt-1">
            Preencha seus dados para se cadastrar
          </p>
        </div>
        <VoterRegistrationForm token={token} />
      </div>
    </section>
  );
}
