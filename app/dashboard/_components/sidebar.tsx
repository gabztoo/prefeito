"use client";

import UserProfile from "@/components/user-profile";
import clsx from "clsx";
import {
  HomeIcon,
  Users,
  UserCheck,
  Shield,
  Settings,
  LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  coordinatorOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    label: "Visão Geral",
    href: "/dashboard",
    icon: HomeIcon,
  },
  {
    label: "Coordenadores",
    href: "/dashboard/coordenadores",
    icon: Shield,
    adminOnly: true,
  },
  {
    label: "Líderes",
    href: "/dashboard/lideres",
    icon: UserCheck,
    adminOnly: true,
    coordinatorOnly: true,
  },
  {
    label: "Eleitores",
    href: "/dashboard/eleitores",
    icon: Users,
  },
];

interface DashboardSideBarProps {
  userRole?: string;
}

export default function DashboardSideBar({ userRole }: DashboardSideBarProps) {
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
    <div className="min-[1024px]:block hidden w-64 border-r h-full bg-background/50">
      <div className="flex h-full flex-col">
        <div className="flex h-[3.45rem] items-center border-b px-4">
          <Link
            prefetch={true}
            className="flex items-center font-semibold hover:cursor-pointer"
            href="/"
          >
            <span className="text-foreground font-bold">Hermes</span>
          </Link>
        </div>

        <nav className="flex flex-col h-full justify-between items-start w-full space-y-1">
          <div className="w-full space-y-1 p-4">
            {filteredNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                  className={clsx(
                    "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:cursor-pointer",
                    pathname === item.href
                      ? "bg-primary/20 text-primary"
                      : "text-foreground hover:bg-foreground/10",
                  )}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-2 w-full">
            <div className="px-4">
              <Link
                href="/dashboard/settings"
                aria-current={pathname === "/dashboard/settings" ? "page" : undefined}
                className={clsx(
                  "flex items-center w-full gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:cursor-pointer",
                  pathname === "/dashboard/settings"
                    ? "bg-primary/20 text-primary"
                    : "text-foreground hover:bg-foreground/10",
                )}
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
                Configurações
              </Link>
            </div>
            <UserProfile />
            <div className="px-4 pb-4">
              <p className="text-xs text-foreground/70 text-center mb-2">Desenvolvido por</p>
              <div className="flex items-center justify-center gap-4">
                <a
                  href="https://www.instagram.com/sugiiartz?igsi=dXEyeHo4cDhoZjNn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground/70 hover:text-primary flex items-center gap-1 text-xs duration-150"
                >
                  <InstagramIcon className="h-3 w-3" />
                  <span>@sugiiartz</span>
                </a>
                <a
                  href="https://www.instagram.com/gabztoo?igsi=OWJvZDQ3M21qbHE1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground/70 hover:text-primary flex items-center gap-1 text-xs duration-150"
                >
                  <InstagramIcon className="h-3 w-3" />
                  <span>@macae092</span>
                </a>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
