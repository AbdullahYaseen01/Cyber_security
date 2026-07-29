import Link from "next/link";
import { Shield, Zap, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-navy-950 text-white overflow-hidden">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-950/30 via-navy-950 to-navy-950" />
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggIGQ9Ik0zNiAzNGg0djJoLTR6bTAtNHY0aC00di00em0tMTYgMGg0djJoLTR6bTAtNHY0aC00di00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />

      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl">QuantumShield</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="text-slate-400 hover:text-white transition-colors text-sm">
            Pricing
          </Link>
          <Link href="/auth/login" className="text-slate-400 hover:text-white transition-colors text-sm">
            Sign In
          </Link>
          <Button variant="glow" asChild>
            <Link href="/auth/signup">Start for $1/mo</Link>
          </Button>
        </div>
      </nav>

      <section className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-sm mb-8">
          <Zap className="w-4 h-4" />
          Deep Web Vulnerability Scanner — 1M+ checks
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          <span className="text-gradient">World-Class</span>
          <br />
          Cybersecurity Platform
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
          9 integrated security modules. Real-time threat intelligence. AI-powered vulnerability inference.
          Enterprise-grade protection starting at just $1/month.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="glow" size="lg" asChild>
            <Link href="/auth/signup">
              Get Started — $1/mo <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button variant="secondary" size="lg" asChild>
            <Link href="/pricing">View Plans</Link>
          </Button>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {[
            { icon: Shield, title: "13-Phase Deep Scanner", desc: "Recon to exploit verification with 90% confidence threshold" },
            { icon: Zap, title: "Real-Time SSE Feed", desc: "Live threat stream with holographic progress indicators" },
            { icon: Lock, title: "Zero Free Tier", desc: "Every feature is paid. Premium experience from day one" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass p-6 hover:border-cyan-500/30 transition-colors">
              <Icon className="w-8 h-8 text-cyan-400 mb-4" />
              <h3 className="font-semibold text-lg mb-2">{title}</h3>
              <p className="text-slate-400 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 border-t border-white/10 py-20">
        <div className="max-w-7xl mx-auto px-8">
          <h2 className="text-3xl font-bold text-center mb-12">9 Security Modules, One Platform</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              "Deep Scanner", "API Security", "Agent Security", "Cloud Guard", "Phishing Shield",
              "Dark Web Intel", "Compliance Hub", "Reports Center", "Academy",
            ].map((mod) => (
              <div key={mod} className="glass p-4 text-center text-sm hover:glow-cyan transition-all">
                <CheckCircle2 className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
                {mod}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
