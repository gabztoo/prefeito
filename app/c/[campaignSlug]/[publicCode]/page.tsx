import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { VoterRegistrationForm } from "./voter-registration-form";
import { CampaignStatus, resolvePublicLink } from "@/lib/services/campaign";

interface PageProps {
  params: Promise<{
    campaignSlug: string;
    publicCode: string;
  }>;
}

export default async function PublicVoterRegistrationPage({ params }: PageProps) {
  const { campaignSlug, publicCode } = await params;
  const linkResult = await resolvePublicLink(campaignSlug, publicCode);

  if (!linkResult.ok) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Link indisponível</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{linkResult.message}</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const link = linkResult.data;
  const isOpen = link.active && link.campaignStatus === CampaignStatus.OPEN;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Cadastro de Eleitor</CardTitle>
          <CardDescription>
            {link.campaignName} · Líder: {link.leaderName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isOpen ? (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                Usaremos estes dados exclusivamente para organizar a campanha. Saiba mais na{" "}
                <Link href="/privacidade" className="underline underline-offset-4">
                  política de privacidade
                </Link>
                .
              </p>
              <VoterRegistrationForm campaignSlug={campaignSlug} publicCode={publicCode} />
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Esta campanha não está aceitando novos cadastros no momento.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
