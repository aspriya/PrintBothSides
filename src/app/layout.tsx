import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrintBothSides",
  description: "Arrange two local images on a printable PDF page.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
