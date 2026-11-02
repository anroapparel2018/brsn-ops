import type { Metadata, Viewport } from "next";
import { Archivo, Fira_Sans } from "next/font/google";
import "./globals.css";

const fira = Fira_Sans({
  variable: "--font-fira",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BRSN OPS",
  description: "Les agents de Julien Brisson, au même endroit.",
  appleWebApp: { capable: true, title: "BRSN OPS", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: "#141414",
  viewportFit: "cover",
};

// Mode sombre par défaut ; le mode clair (Réglages) est appliqué avant l'affichage, sans clignotement.
const THEME = `try{if(localStorage.getItem("theme")==="clair")document.documentElement.classList.add("clair")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr-CA" className={`${archivo.variable} ${fira.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
