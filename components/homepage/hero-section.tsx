import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="py-20">
      <div className="relative z-10 mx-auto w-full max-w-2xl px-6 lg:px-0">
        <div className="relative text-center">
          <h1 className="mx-auto mt-12 max-w-xl text-balance text-5xl font-medium">
            Sistema de Cadastro Eleitoral
          </h1>
          <p className="text-muted-foreground mx-auto mb-6 mt-4 text-balance text-xl">
            Sistema para campanhas eleitorais cadastrarem eleitores por links
            individuais de líderes.
          </p>
          <div className="flex flex-col items-center gap-2 *:w-full sm:flex-row sm:justify-center sm:*:w-auto">
            <Button asChild variant="default" size="sm">
              <Link href="/dashboard" prefetch={true}>
                <span className="text-nowrap">Acessar Painel</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
