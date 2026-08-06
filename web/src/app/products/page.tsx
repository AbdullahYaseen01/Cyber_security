import type { Metadata } from "next";
import ProductsPage from "./products-client";

export const metadata: Metadata = {
  title: "Products — QuantumShield Cybersecurity OS",
  description:
    "QuantumStrike AI autonomous pentest, Deep Scanner, Identity Control Plane, Adaptive AI Defense, Cloud Guard, Phishing Shield, Dark Web Intel, Compliance Hub, and Reports — the full QuantumShield suite.",
};

export default function Page() {
  return <ProductsPage />;
}
