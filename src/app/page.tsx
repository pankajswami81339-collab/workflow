"use client";

import Link from "next/link";
import { useState } from "react";
import {
  MessageSquare,
  Zap,
  ShieldCheck,
  Bot,
  Users,
  Radio,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Workflow,
  Check,
  Lock,
  ChevronRight,
  Menu,
  X,
  Smartphone,
  BarChart3,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Glow Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-emerald-600/20 via-teal-500/15 to-cyan-500/10 blur-[130px] rounded-full" />
        <div className="absolute top-[600px] -left-40 w-[500px] h-[500px] bg-emerald-500/10 blur-[140px] rounded-full" />
        <div className="absolute top-[1200px] -right-40 w-[600px] h-[600px] bg-cyan-500/10 blur-[150px] rounded-full" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/70 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 text-slate-950 font-black shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform duration-200">
              <Zap className="h-5 w-5 fill-slate-950 text-slate-950" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                Adscale Zen
              </span>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                SaaS
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-emerald-400 transition-colors">
              Features
            </a>
            <a href="#inbox" className="hover:text-emerald-400 transition-colors">
              Shared Inbox
            </a>
            <a href="#automations" className="hover:text-emerald-400 transition-colors">
              Automations
            </a>
            <a href="#embedded-signup" className="hover:text-emerald-400 transition-colors">
              Embedded Connect
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-semibold shadow-lg shadow-emerald-500/25 px-5">
                Get Started Free
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-800 bg-slate-950/95 px-4 pt-3 pb-6 flex flex-col gap-3">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-300 hover:text-emerald-400 py-1"
            >
              Features
            </a>
            <a
              href="#inbox"
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-300 hover:text-emerald-400 py-1"
            >
              Shared Inbox
            </a>
            <a
              href="#automations"
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-300 hover:text-emerald-400 py-1"
            >
              Automations
            </a>
            <div className="flex flex-col gap-2 pt-3 border-t border-slate-800">
              <Link href="/login">
                <Button variant="outline" className="w-full border-slate-700 text-slate-200">
                  Sign In
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="w-full bg-emerald-500 text-slate-950 font-semibold">
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 md:pt-28 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-medium mb-8 backdrop-blur-sm animate-pulse">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          <span>Next-Gen WhatsApp CRM & Marketing Automation API</span>
          <ChevronRight className="h-3.5 w-3.5 text-emerald-400" />
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-[1.12]">
          Supercharge your WhatsApp Sales & Support with{" "}
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Adscale Zen
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed">
          The enterprise-ready WhatsApp CRM platform. Manage multi-agent shared inboxes,
          automate replies with AI, execute high-converting broadcasts, and connect via
          Meta Embedded Signup in 60 seconds.
        </p>

        {/* Hero CTA buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/signup" className="w-full sm:w-auto">
            <Button className="h-13 px-8 text-base bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-xl shadow-emerald-500/20 w-full sm:w-auto flex items-center justify-center gap-3">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <Button
              variant="outline"
              className="h-13 px-8 text-base border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 w-full sm:w-auto font-medium"
            >
              Sign In to Dashboard
            </Button>
          </Link>
        </div>

        {/* Feature Badges */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-400 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>98% Message Open Rates</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-400 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>1-Click Facebook Connect</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-400 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Official Meta Cloud API</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-400 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Zero Per-Seat Markup</span>
          </div>
        </div>

        {/* Visual CRM App Preview (Mockup) */}
        <div className="mt-14 relative rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 p-2 sm:p-4 shadow-2xl shadow-emerald-500/10">
          <div className="rounded-xl border border-slate-800/80 bg-slate-950 overflow-hidden shadow-2xl">
            {/* App Chrome Bar */}
            <div className="h-10 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded border border-slate-800">
                https://app.adscalezen.com/inbox
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Live WhatsApp Sync</span>
              </div>
            </div>

            {/* Mock Dashboard Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[460px] text-left">
              {/* Left Contacts Strip */}
              <div className="md:col-span-4 border-r border-slate-800 bg-slate-950/80 p-3 flex flex-col gap-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-2 py-1">
                  Active Conversations
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/30 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center shrink-0">
                    JD
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-100">John Doe</span>
                      <span className="text-[11px] text-emerald-400">Just now</span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      I want to activate the WhatsApp API for our store!
                    </p>
                    <div className="flex gap-1.5 mt-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Hot Lead
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        Enterprise
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 hover:bg-slate-900/40 border border-slate-800/60 flex items-start gap-3 opacity-70">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">
                    SK
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-200">Sarah Khan</span>
                      <span className="text-[11px] text-slate-500">12m ago</span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      Order #4928 delivery status confirmed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Thread Center */}
              <div className="md:col-span-8 bg-slate-950 flex flex-col justify-between p-4 sm:p-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center">
                      JD
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-100">John Doe</h4>
                      <p className="text-xs text-slate-400">+1 (555) 349-2041 · WhatsApp Verified</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                      Assigned: Sarah (Agent)
                    </span>
                  </div>
                </div>

                {/* Messages Bubbles */}
                <div className="space-y-4 my-6">
                  {/* Incoming */}
                  <div className="flex items-end gap-2">
                    <div className="max-w-md rounded-2xl rounded-bl-sm bg-slate-900 border border-slate-800 px-4 py-3 text-sm text-slate-200 shadow-sm">
                      Hi team, we are scaling to 50,000 monthly WhatsApp messages. Can Adscale Zen handle our campaign broadcasts?
                      <div className="text-[10px] text-slate-500 text-right mt-1">10:42 AM</div>
                    </div>
                  </div>

                  {/* AI Bot Auto-Response */}
                  <div className="flex items-end justify-end gap-2">
                    <div className="max-w-md rounded-2xl rounded-br-sm bg-emerald-600/20 border border-emerald-500/40 px-4 py-3 text-sm text-slate-100 shadow-sm">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 mb-1">
                        <Bot className="h-3.5 w-3.5" />
                        <span>Adscale Zen AI Copilot</span>
                      </div>
                      Yes John! Adscale Zen supports unlimited broadcasts using official Meta Cloud API with high throughput, instant delivery status, and automatic opt-out tags.
                      <div className="text-[10px] text-emerald-400/70 text-right mt-1">10:42 AM · Sent ✓✓</div>
                    </div>
                  </div>
                </div>

                {/* Input Bar */}
                <div className="pt-3 border-t border-slate-800 flex items-center gap-3">
                  <div className="flex-1 bg-slate-900/80 rounded-xl border border-slate-700/80 px-4 py-2.5 text-xs text-slate-400 flex items-center justify-between">
                    <span>Type reply or use AI Smart Assist...</span>
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                  </div>
                  <Button className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 text-xs">
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs uppercase tracking-widest text-emerald-400 font-bold mb-3">
            Enterprise Features
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100">
            Everything your team needs to sell and support on WhatsApp
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 md:p-8 hover:border-emerald-500/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-5">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">Multi-Agent Shared Inbox</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Enable your whole team to work seamlessly from a single official WhatsApp Business number. Assign chats, leave private internal notes, and track response speed.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 md:p-8 hover:border-emerald-500/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-5">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">Meta Embedded Signup</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Connect with Facebook in one click. Clients onboard effortlessly without navigating complex developer dashboards or manual tokens.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 md:p-8 hover:border-emerald-500/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-5">
              <Radio className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">Targeted Broadcasts</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Send personalized marketing campaigns and official Meta-approved templates to segmented tag lists with 98% delivery and read analytics.
            </p>
          </div>

          {/* Card 4 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 md:p-8 hover:border-emerald-500/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center mb-5">
              <Workflow className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">No-Code Automations</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Build automated keyword bots, out-of-hours autoresponders, pipeline stage triggers, and customer qualification funnels visually.
            </p>
          </div>

          {/* Card 5 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 md:p-8 hover:border-emerald-500/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-5">
              <Bot className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">AI Knowledge Base Copilot</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Bring your own OpenAI or Anthropic key. Connect your company documentation to auto-draft accurate, human-like answers in seconds.
            </p>
          </div>

          {/* Card 6 */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 md:p-8 hover:border-emerald-500/40 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-5">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">Enterprise Security & API</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Row Level Security (RLS), HMAC-SHA256 webhook signatures, scoped REST API keys, and end-to-end token encryption (AES-256-GCM).
            </p>
          </div>
        </div>
      </section>

      {/* How it works section */}
      <section className="py-20 border-t border-slate-800/80 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-xs uppercase tracking-widest text-emerald-400 font-bold mb-3">
              Fast Onboarding
            </h2>
            <p className="text-3xl font-extrabold text-slate-100">
              Live on WhatsApp in 3 Simple Steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="text-3xl font-black text-emerald-400 mb-4">01</div>
              <h4 className="text-base font-bold text-slate-100 mb-2">Sign in with Google</h4>
              <p className="text-xs sm:text-sm text-slate-400">
                Log in instantly using your Google account. Your dedicated Adscale Zen tenant and database profile are bootstrapped automatically.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="text-3xl font-black text-teal-400 mb-4">02</div>
              <h4 className="text-base font-bold text-slate-100 mb-2">Connect via Facebook</h4>
              <p className="text-xs sm:text-sm text-slate-400">
                Click "Connect with Facebook" to link your official WhatsApp Business account and verify your phone number via Meta Embedded Signup.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="text-3xl font-black text-cyan-400 mb-4">03</div>
              <h4 className="text-base font-bold text-slate-100 mb-2">Engage & Automate</h4>
              <p className="text-xs sm:text-sm text-slate-400">
                Receive inbound customer chats in your team inbox, configure AI automations, and launch revenue-driving broadcasts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="relative rounded-3xl p-8 sm:p-14 bg-gradient-to-tr from-emerald-950/70 via-slate-900 to-slate-950 border border-emerald-500/30 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 bg-emerald-500/20 blur-3xl rounded-full" />
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
            Ready to scale your WhatsApp marketing?
          </h2>
          <p className="mt-4 text-base text-slate-400 max-w-xl mx-auto">
            Get started with Adscale Zen today. Connect your team and your customer conversations in one unified place.
          </p>
          <div className="mt-8 flex justify-center">
            <Link href="/signup">
              <Button className="h-12 px-8 text-base bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/25">
                Start Free with Google
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <Zap className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-slate-300">Adscale Zen</span>
          <span>— WhatsApp CRM & Automation API</span>
        </div>
        <div>
          © 2026 Adscale Zen. Built with official WhatsApp Business Cloud API.
        </div>
      </footer>
    </div>
  );
}
