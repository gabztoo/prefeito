"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

interface VotersPaginationProps {
  total: number;
  page: number;
  limit: number;
}

export function VotersPagination({ total, page, limit }: VotersPaginationProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const totalPages = Math.ceil(total / limit);

  if (totalPages <= 1) return null;

  const goToPage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;

    startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      params.set("page", String(newPage));
      router.push(`/dashboard/eleitores?${params.toString()}`);
    });
  };

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    const showPages = 5;

    if (totalPages <= showPages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(page - 1);
        pages.push(page);
        pages.push(page + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => goToPage(page - 1)}
        disabled={page <= 1 || isPending}
      >
        <ChevronLeftIcon className="size-4" />
        Anterior
      </Button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((p, idx) =>
          p === "..." ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
              ...
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              onClick={() => goToPage(p)}
              disabled={isPending}
              className="w-9"
            >
              {p}
            </Button>
          )
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => goToPage(page + 1)}
        disabled={page >= totalPages || isPending}
      >
        Próxima
        <ChevronRightIcon className="size-4" />
      </Button>
    </div>
  );
}
