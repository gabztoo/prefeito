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
    <div className="min-[1024px]:block hidden w-[280px] h-full relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/sidebar.jpeg')" }}
      />
      <div className="absolute inset-0 bg-[#1a3a8a]/10" />
      <div className="relative flex h-full flex-col z-10">
        <nav className="flex flex-col h-full justify-between items-start w-full">
          <div className="w-full space-y-1 px-4 pt-[260px]">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={clsx(
                    "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors hover:cursor-pointer",
                    isActive
                      ? "bg-white/20 text-[#06b6d4]"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex flex-col gap-1 w-full pb-[100px]">
            <div className="px-4">
              <Link
                href="/dashboard/settings"
                aria-current={pathname === "/dashboard/settings" ? "page" : undefined}
                className={clsx(
                  "flex items-center w-full gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors hover:cursor-pointer",
                  pathname === "/dashboard/settings"
                    ? "bg-white/20 text-[#06b6d4]"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                <Settings className="h-5 w-5" aria-hidden="true" />
                Configurações
              </Link>
            </div>
            <UserProfile />
          </div>
        </nav>
      </div>
    </div>
  );
}
