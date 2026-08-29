import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import { ThemeProvider } from "../components/provider";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
export const metadata: Metadata = {
  title: "Sistema de Cadastro Eleitoral",
  description:
    "Sistema para campanhas eleitorais cadastrarem eleitores por links individuais de líderes.",
  openGraph: {
    title: "Sistema de Cadastro Eleitoral",
    description:
      "Sistema para campanhas eleitorais cadastrarem eleitores por links individuais de líderes.",
    url: "",
    siteName: "Sistema de Cadastro Eleitoral",
    images: [],
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`font-[-apple-system,BlinkMacSystemFont]antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          forcedTheme="light"
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
