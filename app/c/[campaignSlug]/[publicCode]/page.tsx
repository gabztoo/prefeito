import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { VoterRegistrationForm } from "./voter-registration-form";

interface PageProps {
  params: Promise<{
    campaignSlug: string;
    publicCode: string;
  }>;
}

export default async function PublicVoterRegistrationPage({ params }: PageProps) {
  const { campaignSlug, publicCode } = await params;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Cadastro de Eleitor</CardTitle>
          <CardDescription>
            Preencha seus dados para se cadastrar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VoterRegistrationForm 
            campaignSlug={campaignSlug} 
            publicCode={publicCode} 
          />
        </CardContent>
      </Card>
    </main>
  );
}
