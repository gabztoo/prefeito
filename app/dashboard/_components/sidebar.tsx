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
    <div className="min-[1024px]:block hidden w-[280px] h-full relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/sidebar.jpeg')" }}
      />
      <div className="absolute inset-0 bg-[#1a3a8a]/10" />
      <div className="relative flex h-full flex-col z-10">
        <nav className="flex flex-col h-full justify-between items-start w-full">
          <div className="w-full space-y-1 px-4 pt-[200px]">
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
                      ? "bg-white/20 text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <item.icon
                    className={clsx("h-5 w-5", isActive && "text-[#06b6d4]")}
                    aria-hidden="true"
                    {...(isActive ? { fill: "currentColor" } : {})}
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex flex-col gap-1 w-full pb-[160px]">
            <div className="px-4">
              <Link
                href="/dashboard/settings"
                aria-current={pathname === "/dashboard/settings" ? "page" : undefined}
                className={clsx(
                  "flex items-center w-full gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors hover:cursor-pointer",
                  pathname === "/dashboard/settings"
                    ? "bg-white/20 text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                <Settings
                  className={clsx("h-5 w-5", pathname === "/dashboard/settings" && "text-[#06b6d4]")}
                  aria-hidden="true"
                  {...(pathname === "/dashboard/settings" ? { fill: "currentColor" } : {})}
                />
                Configurações
              </Link>
            </div>
            <UserProfile sidebar />
            <div className="px-4 pt-2">
              <p className="text-[11px] text-white/40 text-center mb-1">Desenvolvido por</p>
              <div className="flex items-center justify-center gap-3">
                <a
                  href="https://www.instagram.com/sugiiartz?igsi=dXEyeHo4cDhoZjNn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white flex items-center gap-1 text-[11px] duration-150"
                >
                  <InstagramIcon className="h-3 w-3" />
                  <span>sugiiartz</span>
                </a>
                <a
                  href="https://www.instagram.com/gabztoo?igsi=OWJvZDQ3M21qbHE1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white flex items-center gap-1 text-[11px] duration-150"
                >
                  <InstagramIcon className="h-3 w-3" />
                  <span>macae092</span>
                </a>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}
