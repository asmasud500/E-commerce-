import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Store",
  description: "Production-ready e-commerce platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
