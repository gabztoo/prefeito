"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";

interface VotersFiltersProps {
  isAdmin: boolean;
  campaignsResult: {
    ok: boolean;
    data?: {
      campaigns: Array<{
        id: string;
        name: string;
      }>;
    };
  };
}

export function VotersFilters({ isAdmin, campaignsResult }: VotersFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [zone, setZone] = useState(searchParams.get("zone") || "");
  const [section, setSection] = useState(searchParams.get("section") || "");
  const [campaignId, setCampaignId] = useState(searchParams.get("campaignId") || "");

  const applyFilters = (overrides?: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const newSearch = overrides?.search ?? search;
    const newZone = overrides?.zone ?? zone;
    const newSection = overrides?.section ?? section;
    const newCampaignId = overrides?.campaignId ?? campaignId;

    if (newSearch) params.set("search", newSearch);
    if (newZone) params.set("zone", newZone);
    if (newSection) params.set("section", newSection);
    if (newCampaignId) params.set("campaignId", newCampaignId);

    params.set("page", "1");

    startTransition(() => {
      router.push(`/dashboard/eleitores?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    setSearch("");
    setZone("");
    setSection("");
    setCampaignId("");
    startTransition(() => {
      router.push("/dashboard/eleitores");
    });
  };

  const hasFilters = search || zone || section || campaignId;

  return (
    <Card className="mt-4">
      <CardContent className="pt-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyFilters();
                }}
                className="pl-9"
              />
            </div>
            <Input
              placeholder="Zona"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
              className="w-full md:w-24"
              maxLength={4}
            />
            <Input
              placeholder="Seção"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
              className="w-full md:w-24"
              maxLength={4}
            />
            {isAdmin && campaignsResult.ok && campaignsResult.data && (
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className="flex h-9 w-full md:w-48 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Todas campanhas</option>
                {campaignsResult.data.campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => applyFilters()}
              disabled={isPending}
              size="sm"
            >
              Filtrar
            </Button>
            {hasFilters && (
              <Button
                onClick={clearFilters}
                variant="ghost"
                size="sm"
                disabled={isPending}
              >
                <XIcon className="size-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
