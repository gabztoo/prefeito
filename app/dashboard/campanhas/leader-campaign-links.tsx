"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LeaderCampaignLink {
  campaignLeaderId: string;
  leaderName?: string;
  leaderEmail?: string;
  campaignName: string;
  campaignSlug: string;
  campaignStatus: "draft" | "open" | "closed";
  publicCode: string;
  url: string;
  active?: boolean;
}

interface LeaderCampaignLinksProps {
  links: LeaderCampaignLink[];
}

const campaignStatusLabels = {
  draft: "Rascunho",
  open: "Aberta",
  closed: "Encerrada",
} as const;

export function LeaderCampaignLinks({ links }: LeaderCampaignLinksProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyLink(link: LeaderCampaignLink) {
    await navigator.clipboard.writeText(link.url);
    setCopiedId(link.campaignLeaderId);
    window.setTimeout(() => setCopiedId(null), 2000);
  }

  if (links.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-sm text-muted-foreground">
            Nenhuma campanha foi vinculada ao seu usuário. Solicite o vínculo ao administrador.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {links.map((link) => {
        const isOpen = link.campaignStatus === "open";

        const isActive = link.active !== false;

        return (
          <Card key={link.campaignLeaderId}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  {link.leaderName ? (
                    <>
                      <CardTitle className="text-lg">{link.leaderName}</CardTitle>
                      {link.leaderEmail && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {link.leaderEmail}
                        </p>
                      )}
                      <p className="mt-2 text-sm text-muted-foreground">
                        Campanha: {link.campaignName}
                      </p>
                    </>
                  ) : (
                    <CardTitle className="text-lg">{link.campaignName}</CardTitle>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">/{link.campaignSlug}</p>
                </div>
                <Badge variant={isActive && isOpen ? "default" : "outline"}>
                  {!isActive ? "Inativo" : campaignStatusLabels[link.campaignStatus]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3">
                <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <code className="min-w-0 flex-1 break-all text-xs">{link.url}</code>
              </div>
              {!isOpen && (
                <p className="text-xs text-muted-foreground">
                  O link ficará disponível para cadastro quando a campanha for aberta.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => copyLink(link)} disabled={!isActive}>
                  {copiedId === link.campaignLeaderId ? (
                    <>
                      <Check aria-hidden="true" /> Link copiado
                    </>
                  ) : (
                    <>
                      <Copy aria-hidden="true" /> Copiar link
                    </>
                  )}
                </Button>
                <Button asChild type="button" variant="outline" disabled={!isActive}>
                  <a href={isActive ? link.url : undefined} target="_blank" rel="noreferrer">
                    <ExternalLink aria-hidden="true" /> Abrir cadastro
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
