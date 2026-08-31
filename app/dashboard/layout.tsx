import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import DashboardTopNav from "./_components/navbar";
import DashboardSideBar from "./_components/sidebar";

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
    <div className="flex h-screen overflow-hidden w-full bg-[url('/bg.jpeg')] bg-[length:auto_100vh] bg-[position:256px_top] bg-no-repeat bg-fixed">
      <DashboardSideBar userRole={result.user?.role ?? undefined} />
      <main className="flex-1 overflow-y-auto">
        <DashboardTopNav userRole={result.user?.role ?? undefined}>
          {children}
        </DashboardTopNav>
      </main>
    </div>
  );
}
