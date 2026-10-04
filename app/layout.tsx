import type { ReactNode } from "react";
import { PRODUCT_NAME } from "../lib/brand";
import "./globals.css";
export const metadata = { title: PRODUCT_NAME, description: "Shareable tokenized-stock portfolios." };
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
