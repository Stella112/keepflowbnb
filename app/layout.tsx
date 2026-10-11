import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { PRODUCT_NAME } from "../lib/brand";
import "./globals.css";
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" });
export const metadata = { title: PRODUCT_NAME, description: "Own tokenized stocks like NVIDIA and Apple on BNB Chain from your own wallet. Share portfolios as Flows and keep them on track under your own rules." };
export const viewport = { themeColor: "#0f3d2e" };
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en" className={inter.variable}><body>{children}</body></html>;
}
