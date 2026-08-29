import { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
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

  return (
    <div className="flex h-screen overflow-hidden w-full">
      <DashboardSideBar userRole={result.user?.role ?? undefined} />
      <main className="flex-1 overflow-y-auto">
        <DashboardTopNav>{children}</DashboardTopNav>
      </main>
    </div>
  );
}
