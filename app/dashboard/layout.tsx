import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import DashboardTopNav from "./_components/navbar";
import DashboardSideBar from "./_components/sidebar";
import MobileNav from "./_components/mobile-nav";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    redirect("/sign-in");
  }

  const [currentUser] = await db
    .select({ mustChangePassword: user.mustChangePassword })
    .from(user)
    .where(eq(user.id, result.session.userId))
    .limit(1);

  if (currentUser?.mustChangePassword) {
    redirect("/alterar-senha");
  }

  return (
    <div className="flex h-screen overflow-hidden w-full">
      <DashboardSideBar userRole={result.user?.role ?? undefined} />
      <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
        <DashboardTopNav userRole={result.user?.role ?? undefined}>
          {children}
        </DashboardTopNav>
      </main>
      <MobileNav userRole={result.user?.role ?? undefined} />
    </div>
  );
}
