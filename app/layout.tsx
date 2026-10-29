import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Svampodlaren – från mycel till skörd",
  description: "Din svenska odlingsdagbok för projekt, batcher och skördar.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
