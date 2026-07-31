import { HeroSection } from "@/components/landing/hero-section";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-navy-950 text-white overflow-hidden">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/30 via-navy-950 to-navy-950" />
      <HeroSection />
    </div>
  );
}
