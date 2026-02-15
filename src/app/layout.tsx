import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "Task Board Assignment",
  description: "Frontend internship assignment task board",
};

const themeInitScript = `
  (function () {
    try {
      var key = "taskboard_theme";
      var saved = localStorage.getItem(key);
      var theme = (saved === "light" || saved === "dark")
        ? saved
        : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      document.documentElement.setAttribute("data-theme", theme);
    } catch (error) {
      document.documentElement.setAttribute("data-theme", "light");
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${geist.variable} antialiased`}>{children}</body>
    </html>
  );
}
