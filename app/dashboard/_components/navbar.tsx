"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import UserProfile from "@/components/user-profile";
import {
  HomeIcon,
  Vote,
  Settings,
  UserCheck,
  Users,
  Menu,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";
import clsx from "clsx";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: typeof HomeIcon;
  adminOnly?: boolean;
  coordinatorOnly?: boolean;
}

interface DashboardTopNavProps {
  children: ReactNode;
  userRole?: string;
}

const navItems: NavItem[] = [
  { label: "Visão Geral", href: "/dashboard", icon: HomeIcon },
  { label: "Coordenadores", href: "/dashboard/coordenadores", icon: Shield, adminOnly: true },
  { label: "Líderes", href: "/dashboard/lideres", icon: UserCheck, adminOnly: true, coordinatorOnly: true },
  { label: "Eleitores", href: "/dashboard/eleitores", icon: Users },
  { label: "Campanhas", href: "/dashboard/campanhas", icon: Vote },
  { label: "Configurações", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardTopNav({
  children,
  userRole,
}: DashboardTopNavProps) {
  const pathname = usePathname();
  const isAdmin = userRole === "admin";
  const isCoordinator = userRole === "coordinator";
  const filteredNavItems = navItems.filter(
    (item) =>
      (!item.adminOnly && !item.coordinatorOnly) ||
      (item.adminOnly && isAdmin) ||
      (item.coordinatorOnly && (isAdmin || isCoordinator))
  );

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-3 backdrop-blur lg:h-[52px] lg:px-5">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="min-[1024px]:hidden"
              aria-label="Abrir menu de navegação"
            >
              <Menu aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(20rem,85vw)]">
            <SheetHeader className="text-left">
              <SheetTitle>Sistema Eleitoral</SheetTitle>
              <SheetDescription>
                Navegue pelo painel administrativo.
              </SheetDescription>
            </SheetHeader>
            <nav className="mt-4 flex flex-col gap-1" aria-label="Menu principal">
              {filteredNavItems.map(({ label, href, icon: Icon }) => (
                <SheetClose key={href} asChild>
                  <Link
                    href={href}
                    aria-current={pathname === href ? "page" : undefined}
                    className={clsx(
                      "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-[background-color,color]",
                      pathname === href
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </Link>
                </SheetClose>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <Link
          href="/dashboard"
          className="text-sm font-semibold min-[1024px]:hidden"
        >
          Sistema Eleitoral
        </Link>
        <div className="ml-auto">
          <UserProfile mini={true} />
        </div>
      </header>
      {children}
    </div>
  );
}
