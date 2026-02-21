import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Car, Search, BarChart3, GitCompareArrows } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SkipNav } from "@/components/skip-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AutoOfertas AR - Las mejores ofertas de autos en Argentina",
  description:
    "Encontrá el mejor auto al mejor precio. Comparamos MercadoLibre, DeMotores, Autocosmos y Kavak para mostrarte las mejores ofertas.",
};

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Car size={24} className="text-primary" aria-hidden="true" />
          <span>
            Auto<span className="text-emerald-600">Ofertas</span>
          </span>
        </Link>
        <nav aria-label="Navegación principal" className="hidden md:flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/buscar" className="gap-1.5">
              <Search size={14} aria-hidden="true" />
              Buscar
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/rankings" className="gap-1.5">
              <BarChart3 size={14} aria-hidden="true" />
              Rankings
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/comparar" className="gap-1.5">
              <GitCompareArrows size={14} aria-hidden="true" />
              Comparar
            </Link>
          </Button>
        </nav>
        <div className="flex md:hidden items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/buscar" aria-label="Buscar">
              <Search size={18} aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Car size={16} aria-hidden="true" />
            <span>
              Auto<strong>Ofertas</strong> AR — Datos de MercadoLibre, DeMotores,
              Autocosmos y Kavak
            </span>
          </div>
          <nav aria-label="Navegación al pie" className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/buscar" className="hover:text-foreground transition-colors">
              Buscar
            </Link>
            <Link href="/rankings" className="hover:text-foreground transition-colors">
              Rankings
            </Link>
            <Link href="/comparar" className="hover:text-foreground transition-colors">
              Comparar
            </Link>
          </nav>
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Los precios y datos son orientativos. Verificá siempre en la
          publicación original antes de realizar una compra.
        </p>
      </div>
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <SkipNav />
        <TooltipProvider delayDuration={200}>
          <Navbar />
          <main id="main-content" className="flex-1">{children}</main>
          <Footer />
        </TooltipProvider>
      </body>
    </html>
  );
}
