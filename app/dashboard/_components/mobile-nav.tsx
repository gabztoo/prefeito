"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  Users,
  UserCheck,
  Shield,
  UserCircle,
} from "lucide-react";
import clsx from "clsx";

interface NavItem {
  label: string;
  href: string;
  icon: typeof HomeIcon;
  adminOnly?: boolean;
  coordinatorOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: HomeIcon },
  { label: "Coordenadores", href: "/dashboard/coordenadores", icon: Shield, adminOnly: true },
  { label: "Líderes", href: "/dashboard/lideres", icon: UserCheck, adminOnly: true, coordinatorOnly: true },
  { label: "Eleitores", href: "/dashboard/eleitores", icon: Users },
  { label: "Perfil", href: "/dashboard/settings", icon: UserCircle },
];

interface MobileNavProps {
  userRole?: string;
}

export default function MobileNav({ userRole }: MobileNavProps) {
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
    <nav className="min-[1024px]:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#1e40af] border-t border-white/20">
      <div className="flex items-center justify-around h-16 px-2">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center justify-center gap-1 min-w-0 flex-1 py-1 transition-colors",
                isActive
                  ? "text-[#f59e0b]"
                  : "text-white/70 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              <span className="text-[10px] font-medium truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
