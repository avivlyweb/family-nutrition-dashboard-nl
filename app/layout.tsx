import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Familie Voeding Dashboard",
  description: "Prive weekmenu en trainingsschema voor familiegebruik met pincode.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className="dark">
      <body>{children}</body>
    </html>
  );
}
