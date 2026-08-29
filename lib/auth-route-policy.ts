export function isDisabledAuthPath(pathname: string): boolean {
  const authPath = pathname.startsWith("/api/auth/")
    ? pathname.slice("/api/auth".length)
    : pathname;

  return (
    authPath.startsWith("/sign-up/") ||
    authPath === "/reset-password" ||
    authPath.startsWith("/reset-password/") ||
    authPath === "/change-password" ||
    authPath === "/admin" ||
    authPath.startsWith("/admin/")
  );
}
