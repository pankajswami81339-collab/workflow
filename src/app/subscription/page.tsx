'use client';

import { useState, useEffect, useMemo } from 'react';
import { DashboardShell } from '@/app/(dashboard)/dashboard-shell';
import { useSubscription } from '@/hooks/use-subscription';
import {
  Check,
  X,
  Crown,
  Clock,
  Sparkles,
  Zap,
  Calendar,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Users,
  Radio as BroadcastIcon,
  Bot,
  Workflow,
  Loader2,
  RefreshCw,
  PhoneCall,
  CheckCircle2,
  PartyPopper,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Plan } from '@/lib/subscription/types';

// Default static fallback plans to ensure immediate render even before API loads
const FALLBACK_PLANS: Plan[] = [
  {
    id: 'plan-starter',
    name: 'Starter Plan',
    price_inr: 299,
    price_monthly_inr: 299,
    price_yearly_inr: 3229,
    contacts_limit: 2000,
    campaigns_limit: 60,
    bot_replies_limit: 50,
    bot_flows_limit: 5,
    custom_fields_limit: 5,
    team_members_limit: 5,
    ai_bot_access: false,
    api_webhook_access: false,
    whatsapp_calling_api: true,
    features: [
      '2000 Contacts',
      '60 monthly Campaigns',
      '50 Bot Replies',
      '5 Bot Flows',
      '5 Contact Custom Fields',
      '5 Team Members/Agents',
      'Whatsapp Calling API',
    ],
    sort_order: 1,
  },
  {
    id: 'plan-growth',
    name: 'Growth Plan',
    price_inr: 999,
    price_monthly_inr: 999,
    price_yearly_inr: 10789,
    contacts_limit: 50000,
    campaigns_limit: 250,
    bot_replies_limit: 200,
    bot_flows_limit: 25,
    custom_fields_limit: 25,
    team_members_limit: 25,
    ai_bot_access: true,
    api_webhook_access: true,
    whatsapp_calling_api: true,
    features: [
      '50000 Contacts',
      '250 monthly Campaigns',
      '200 Bot Replies',
      '25 Bot Flows',
      '25 Contact Custom Fields',
      '25 Team Members/Agents',
      'AI Chat Bot',
      'API and Webhook Access',
      'Whatsapp Calling API',
    ],
    sort_order: 2,
  },
  {
    id: 'plan-enterprise',
    name: 'Enterprise Plan',
    price_inr: 1999,
    price_monthly_inr: 1999,
    price_yearly_inr: 21589,
    contacts_limit: -1,
    campaigns_limit: -1,
    bot_replies_limit: -1,
    bot_flows_limit: -1,
    custom_fields_limit: -1,
    team_members_limit: -1,
    ai_bot_access: true,
    api_webhook_access: true,
    whatsapp_calling_api: true,
    features: [
      'Unlimited Contacts',
      'Unlimited Campaigns',
      'Unlimited Bot Replies',
      'Unlimited Bot Flows',
      'Unlimited Contact Custom Fields',
      'Unlimited Team Members/Agents',
      'AI Chat Bot',
      'API and Webhook Access',
      'Whatsapp Calling API',
    ],
    sort_order: 3,
  },
];

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface PurchaseSuccessData {
  planName: string;
  amount: number;
  paymentId: string;
  orderId: string;
  billingCycle: string;
}

function SubscriptionContent() {
  const {
    subscription,
    plan: currentPlan,
    plans: fetchedPlans,
    loading,
    isActive,
    isTrial,
    isExpired,
    daysRemaining,
    limits,
    refreshSubscription,
    activateTrial,
    subscribePlan,
  } = useSubscription();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<Plan | null>(null);
  const [modalBillingCycle, setModalBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [submitting, setSubmitting] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [purchaseSuccessData, setPurchaseSuccessData] = useState<PurchaseSuccessData | null>(null);

  // Combine DB plans with fallbacks: exactly 3 paid plans (Starter, Growth, Enterprise)
  const availablePaidPlans = useMemo(() => {
    const list = fetchedPlans.filter(
      (p) =>
        !p.is_trial &&
        p.name !== 'Free Plan' &&
        p.name !== 'Scale' &&
        !p.name.toLowerCase().includes('free')
    );
    if (list.length > 0) return list;
    return FALLBACK_PLANS;
  }, [fetchedPlans]);

  // Current plan features list: ensure it is called "Free Plan" for free/trial tier
  const currentPlanName =
    !currentPlan || currentPlan.is_trial || currentPlan.name === 'Free Plan' || isTrial
      ? 'Free Plan'
      : currentPlan.name;

  const handleStartTrial = async () => {
    setTrialLoading(true);
    try {
      await activateTrial();
    } finally {
      setTrialLoading(false);
    }
  };

  const handleOpenUpgrade = (plan: Plan) => {
    setSelectedPlanForUpgrade(plan);
    setModalBillingCycle(billingCycle);
  };

  const handlePayWithRazorpay = async () => {
    if (!selectedPlanForUpgrade) return;
    setSubmitting(true);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        toast.error('Could not load Razorpay SDK. Please check your internet connection.');
        setSubmitting(false);
        return;
      }

      // 1. Create order on server
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPlanForUpgrade.id,
          billing_cycle: modalBillingCycle,
        }),
      });

      const orderData = await res.json();
      if (!res.ok) {
        toast.error(orderData.error || 'Failed to initiate order');
        setSubmitting(false);
        return;
      }

      // 2. Open Razorpay Checkout modal
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Adscale Zen',
        description: `${orderData.plan_name} (${modalBillingCycle === 'yearly' ? 'Yearly' : 'Monthly'})`,
        order_id: orderData.order_id,
        handler: async function (response: any) {
          const loadingToast = toast.loading('Verifying payment & activating subscription...');
          try {
            const verifyRes = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: selectedPlanForUpgrade.id,
                billing_cycle: modalBillingCycle,
              }),
            });

            const verifyData = await verifyRes.json();
            toast.dismiss(loadingToast);

            if (!verifyRes.ok) {
              toast.error(verifyData.error || 'Payment signature verification failed.');
              setSubmitting(false);
              return;
            }

            // Close checkout modal & show celebration popup
            setSelectedPlanForUpgrade(null);
            setPurchaseSuccessData({
              planName: orderData.plan_name,
              amount: orderData.amount / 100,
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
              billingCycle: modalBillingCycle,
            });

            await refreshSubscription();
          } catch (e) {
            toast.dismiss(loadingToast);
            toast.error('Network error during payment verification.');
          } finally {
            setSubmitting(false);
          }
        },
        prefill: {
          name: orderData.user_details?.name || '',
          email: orderData.user_details?.email || '',
        },
        theme: {
          color: '#10b981',
        },
        modal: {
          ondismiss: function () {
            setSubmitting(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (resp: any) {
        toast.error(resp.error?.description || 'Payment was not completed.');
        setSubmitting(false);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || 'Error launching payment');
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Crown className="h-6 w-6 text-emerald-500" />
            Subscription & Plans
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your account plan, view resource limits & usage, and unlock features.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshSubscription()}
            disabled={loading}
            className="border-border text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {!subscription && (
            <Button
              size="sm"
              onClick={handleStartTrial}
              disabled={trialLoading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm"
            >
              {trialLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1.5" />
              )}
              Start 7-Day Free Trial
            </Button>
          )}
        </div>
      </div>

      {/* ── Status Alerts ──────────────────────────────────────── */}
      {isExpired && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-400 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-300">Subscription Expired</h3>
            <p className="text-xs text-red-400/90 mt-0.5">
              Your previous subscription or trial period has ended. Please choose a paid plan below to restore all features and uninterrupted message delivery.
            </p>
          </div>
        </div>
      )}

      {isTrial && isActive && daysRemaining <= 3 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-300 flex items-start gap-3">
          <Clock className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Trial Expiring Soon</h3>
            <p className="text-xs text-amber-300/90 mt-0.5">
              You have {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left in your 7-Day Free Trial. Upgrade to a paid plan to keep your workflows and bots running seamlessly.
            </p>
          </div>
        </div>
      )}

      {/* ── 1. Current Plan Card (matching the screenshot) ──────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Current Plan
          </h2>
          {subscription && (
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {fmtDate(subscription.start_date)} → {fmtDate(subscription.end_date)}
            </span>
          )}
        </div>

        <Card className="border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border/60 bg-muted/20 py-4 px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-emerald-500">{currentPlanName}</h3>
                  {isTrial && (
                    <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">
                      7-Day Free Trial
                    </Badge>
                  )}
                  {isActive && !isTrial && (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                      Active
                    </Badge>
                  )}
                  {isExpired && (
                    <Badge className="bg-red-500/15 text-red-400 border border-red-500/30 font-medium">
                      Expired
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isTrial
                    ? `${daysRemaining} days remaining in trial period`
                    : isActive
                    ? `Active subscription · ${daysRemaining} days remaining`
                    : 'Plan is currently inactive'}
                </p>
              </div>

              {/* Quick actions on current plan */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const el = document.getElementById('subscribe-plans-section');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                >
                  Change / Upgrade Plan
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {/* Feature List exactly matching TTWAPI / user screenshot format */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8">
              {/* 1. Contacts */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-foreground font-medium">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    {limits?.contacts.unlimited
                      ? 'Unlimited Contacts'
                      : `${limits?.contacts.max ?? 10} Contacts`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {limits?.contacts.used ?? 0} used
                  </span>
                </div>
                {!limits?.contacts.unlimited && (
                  <Progress
                    value={Math.min(
                      100,
                      ((limits?.contacts.used ?? 0) / (limits?.contacts.max || 1)) * 100
                    )}
                    className="h-1.5 bg-muted"
                  />
                )}
              </div>

              {/* 2. Monthly Campaigns */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-foreground font-medium">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    {limits?.campaigns.unlimited
                      ? 'Unlimited Campaigns'
                      : `${limits?.campaigns.max ?? 1} Campaigns Per Month`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {limits?.campaigns.used ?? 0} sent
                  </span>
                </div>
                {!limits?.campaigns.unlimited && (
                  <Progress
                    value={Math.min(
                      100,
                      ((limits?.campaigns.used ?? 0) / (limits?.campaigns.max || 1)) * 100
                    )}
                    className="h-1.5 bg-muted"
                  />
                )}
              </div>

              {/* 3. Bot Replies */}
              <div className="flex items-center text-sm font-medium text-foreground">
                <Check className="h-4 w-4 text-emerald-500 mr-2 shrink-0" />
                {limits?.botReplies.unlimited
                  ? 'Unlimited Bot Replies'
                  : `${limits?.botReplies.max ?? 1} Bot Replies`}
              </div>

              {/* 4. Bot Flows */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-foreground font-medium">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    {limits?.botFlows.unlimited
                      ? 'Unlimited Bot Flows'
                      : `${limits?.botFlows.max ?? 1} Bot Flows`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {limits?.botFlows.used ?? 0} created
                  </span>
                </div>
                {!limits?.botFlows.unlimited && (
                  <Progress
                    value={Math.min(
                      100,
                      ((limits?.botFlows.used ?? 0) / (limits?.botFlows.max || 1)) * 100
                    )}
                    className="h-1.5 bg-muted"
                  />
                )}
              </div>

              {/* 5. Contact Custom Fields */}
              <div className="flex items-center text-sm font-medium text-foreground">
                <Check className="h-4 w-4 text-emerald-500 mr-2 shrink-0" />
                {limits?.customFields.unlimited
                  ? 'Unlimited Contact Custom Fields'
                  : `${limits?.customFields.max ?? 0} Contact Custom Fields`}
              </div>

              {/* 6. Team Members / Agents */}
              <div className="flex items-center text-sm font-medium text-foreground">
                <Check className="h-4 w-4 text-emerald-500 mr-2 shrink-0" />
                {limits?.teamMembers.unlimited
                  ? 'Unlimited Team Members/Agents'
                  : `${limits?.teamMembers.max ?? 0} Team Members/Agents`}
              </div>

              {/* 7. AI Chat Bot */}
              <div className="flex items-center text-sm font-medium">
                {limits?.aiChatBot ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-500 mr-2 shrink-0" />
                    <span className="text-foreground">AI Chat Bot</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 text-red-500 mr-2 shrink-0" />
                    <span className="text-muted-foreground line-through">AI Chat Bot</span>
                  </>
                )}
              </div>

              {/* 8. API and Webhook Access */}
              <div className="flex items-center text-sm font-medium">
                {limits?.apiWebhookAccess ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-500 mr-2 shrink-0" />
                    <span className="text-foreground">API and Webhook Access</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 text-red-500 mr-2 shrink-0" />
                    <span className="text-muted-foreground line-through">API and Webhook Access</span>
                  </>
                )}
              </div>

              {/* 9. Whatsapp Calling API */}
              <div className="flex items-center text-sm font-medium">
                {limits?.whatsappCallingApi !== false ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-500 mr-2 shrink-0" />
                    <span className="text-foreground">Whatsapp Calling API</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 text-red-500 mr-2 shrink-0" />
                    <span className="text-muted-foreground line-through">Whatsapp Calling API</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── 2. Subscribe Paid Plans Section (matching user screenshot) ── */}
      <section id="subscribe-plans-section" className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Subscribe Paid Plans
            </h2>
            <p className="text-sm text-muted-foreground">
              Choose the plan that fits your business scale. Upgrade or change anytime.
            </p>
          </div>

          {/* Billing Cycle Switcher */}
          <div className="flex items-center self-start sm:self-auto rounded-lg border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                billingCycle === 'yearly'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly Billing
              <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 text-[10px] font-semibold">
                Save 10%
              </span>
            </button>
          </div>
        </div>

        {/* ── 3 Plans Grid ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {availablePaidPlans.map((plan) => {
            const isCurrent = currentPlan?.id === plan.id && isActive;
            const isGrowth = plan.name.toLowerCase().includes('growth');
            const isEnterprise = plan.name.toLowerCase().includes('enterprise');

            const monthlyPrice = plan.price_monthly_inr || plan.price_inr || 299;
            const yearlyPrice = plan.price_yearly_inr || Math.round(monthlyPrice * 12 * 0.9);

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col border transition-all duration-200 ${
                  isGrowth
                    ? 'border-emerald-500/50 bg-emerald-950/10 shadow-md ring-1 ring-emerald-500/30'
                    : 'border-border bg-card hover:border-border/80'
                }`}
              >
                {isGrowth && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-0.5 text-[11px] font-semibold text-slate-950 uppercase tracking-wider shadow">
                    Most Popular
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-foreground">
                      {plan.name}
                    </CardTitle>
                    {isCurrent && (
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs">
                        Current Plan
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs text-muted-foreground">
                    {isEnterprise
                      ? 'For enterprise scale & high volume'
                      : isGrowth
                      ? 'For growing teams with AI & APIs'
                      : 'Essential tools for small businesses'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 space-y-5">
                  {/* Features List with green checkmarks & red crossmarks matching screenshot */}
                  <div className="space-y-2.5 text-xs">
                    {/* Contacts */}
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {plan.contacts_limit === -1 || !plan.contacts_limit
                        ? 'Unlimited Contacts'
                        : `${plan.contacts_limit.toLocaleString('en-IN')} Contacts`}
                    </div>

                    {/* Campaigns */}
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {plan.campaigns_limit === -1 || !plan.campaigns_limit
                        ? 'Unlimited Campaigns'
                        : `${plan.campaigns_limit} monthly Campaigns`}
                    </div>

                    {/* Bot Replies */}
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {plan.bot_replies_limit === -1 || !plan.bot_replies_limit
                        ? 'Unlimited Bot Replies'
                        : `${plan.bot_replies_limit} Bot Replies`}
                    </div>

                    {/* Bot Flows */}
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {plan.bot_flows_limit === -1 || !plan.bot_flows_limit
                        ? 'Unlimited Bot Flows'
                        : `${plan.bot_flows_limit} Bot Flows`}
                    </div>

                    {/* Contact Custom Fields */}
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {plan.custom_fields_limit === -1 || !plan.custom_fields_limit
                        ? 'Unlimited Contact Custom Fields'
                        : `${plan.custom_fields_limit} Contact Custom Fields`}
                    </div>

                    {/* Team Members */}
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {plan.team_members_limit === -1 || !plan.team_members_limit
                        ? 'Unlimited Team Members/Agents'
                        : `${plan.team_members_limit} Team Members/Agents`}
                    </div>

                    {/* AI Chat Bot */}
                    <div className="flex items-center gap-2 font-medium">
                      {plan.ai_bot_access ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="text-foreground">AI Chat Bot</span>
                        </>
                      ) : (
                        <>
                          <X className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          <span className="text-muted-foreground">AI Chat Bot</span>
                        </>
                      )}
                    </div>

                    {/* API and Webhook Access */}
                    <div className="flex items-center gap-2 font-medium">
                      {plan.api_webhook_access ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="text-foreground">API and Webhook Access</span>
                        </>
                      ) : (
                        <>
                          <X className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          <span className="text-muted-foreground">API and Webhook Access</span>
                        </>
                      )}
                    </div>

                    {/* Whatsapp Calling API */}
                    <div className="flex items-center gap-2 text-foreground font-medium">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      Whatsapp Calling API
                    </div>
                  </div>

                  <div className="border-t border-border/70 pt-4">
                    {/* Radio options exactly as depicted in the screenshot */}
                    <RadioGroup
                      value={billingCycle}
                      onValueChange={(val) => setBillingCycle(val as 'monthly' | 'yearly')}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2 text-xs">
                        <RadioGroupItem value="monthly" id={`${plan.id}-monthly`} />
                        <Label
                          htmlFor={`${plan.id}-monthly`}
                          className="cursor-pointer font-normal text-muted-foreground"
                        >
                          <span className="font-semibold text-foreground">
                            {monthlyPrice.toLocaleString('en-IN')}.00 INR
                          </span>{' '}
                          / monthly
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2 text-xs">
                        <RadioGroupItem value="yearly" id={`${plan.id}-yearly`} />
                        <Label
                          htmlFor={`${plan.id}-yearly`}
                          className="cursor-pointer font-normal text-muted-foreground"
                        >
                          <span className="font-semibold text-foreground">
                            {yearlyPrice.toLocaleString('en-IN')}.00 INR
                          </span>{' '}
                          / yearly
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>

                <CardFooter className="pt-2 pb-6 px-6">
                  <Button
                    onClick={() => handleOpenUpgrade(plan)}
                    disabled={isCurrent}
                    className={`w-full text-xs font-semibold ${
                      isCurrent
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : isGrowth
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    }`}
                  >
                    {isCurrent ? 'Current Plan' : `Subscribe ${plan.name}`}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── Upgrade Confirmation Dialog ─────────────────────────── */}
      <Dialog
        open={Boolean(selectedPlanForUpgrade)}
        onOpenChange={(open) => !open && setSelectedPlanForUpgrade(null)}
      >
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-emerald-500" />
              Subscribe to {selectedPlanForUpgrade?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Review your plan details and confirm your subscription.
            </DialogDescription>
          </DialogHeader>

          {selectedPlanForUpgrade && (
            <div className="space-y-4 py-2">
              {/* Billing Cycle Selector in Modal */}
              <div className="rounded-lg border border-border p-3 space-y-2">
                <Label className="text-xs text-muted-foreground">Select Billing Frequency</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalBillingCycle('monthly')}
                    className={`rounded-lg border p-2.5 text-left transition-all ${
                      modalBillingCycle === 'monthly'
                        ? 'border-emerald-500 bg-emerald-500/10 text-foreground'
                        : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <p className="text-xs font-bold">Monthly</p>
                    <p className="text-sm font-semibold text-emerald-400 mt-1">
                      ₹
                      {(
                        selectedPlanForUpgrade.price_monthly_inr ||
                        selectedPlanForUpgrade.price_inr
                      ).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-muted-foreground">billed every month</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalBillingCycle('yearly')}
                    className={`rounded-lg border p-2.5 text-left transition-all ${
                      modalBillingCycle === 'yearly'
                        ? 'border-emerald-500 bg-emerald-500/10 text-foreground'
                        : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold">Yearly</p>
                      <span className="rounded bg-emerald-500/20 text-emerald-400 px-1 py-0.2 text-[9px] font-semibold">
                        -10%
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-emerald-400 mt-1">
                      ₹
                      {(
                        selectedPlanForUpgrade.price_yearly_inr ||
                        Math.round((selectedPlanForUpgrade.price_inr || 299) * 12 * 0.9)
                      ).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-muted-foreground">billed annually</p>
                  </button>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="space-y-1.5 text-xs text-muted-foreground border-t border-border pt-3">
                <p className="font-semibold text-foreground mb-1">Included in this plan:</p>
                <div className="grid grid-cols-2 gap-2">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    {selectedPlanForUpgrade.contacts_limit === -1
                      ? 'Unlimited Contacts'
                      : `${selectedPlanForUpgrade.contacts_limit?.toLocaleString('en-IN')} Contacts`}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    {selectedPlanForUpgrade.campaigns_limit === -1
                      ? 'Unlimited Campaigns'
                      : `${selectedPlanForUpgrade.campaigns_limit} Campaigns/mo`}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    {selectedPlanForUpgrade.bot_flows_limit === -1
                      ? 'Unlimited Flows'
                      : `${selectedPlanForUpgrade.bot_flows_limit} Bot Flows`}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    {selectedPlanForUpgrade.team_members_limit === -1
                      ? 'Unlimited Team'
                      : `${selectedPlanForUpgrade.team_members_limit} Team Members`}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPlanForUpgrade(null)}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handlePayWithRazorpay}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-1.5" />
              )}
              Pay with Razorpay & Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Purchase Success Celebration Dialog ─────────────────── */}
      <Dialog
        open={Boolean(purchaseSuccessData)}
        onOpenChange={(open) => !open && setPurchaseSuccessData(null)}
      >
        <DialogContent className="max-w-md bg-card border-emerald-500/40 text-foreground p-6 shadow-2xl">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 ring-8 ring-emerald-500/10">
              <PartyPopper className="h-8 w-8 text-emerald-400" />
            </div>

            <div>
              <DialogTitle className="text-xl font-bold text-foreground">
                Payment Successful! 🎉
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Your subscription payment was verified and your plan is now active!
              </DialogDescription>
            </div>

            {purchaseSuccessData && (
              <div className="w-full rounded-xl border border-border bg-muted/30 p-4 text-xs space-y-2.5 text-left">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-muted-foreground">Activated Plan</span>
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold">
                    {purchaseSuccessData.planName}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-bold text-foreground text-sm">
                    ₹{purchaseSuccessData.amount.toLocaleString('en-IN')}.00
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Billing Frequency</span>
                  <span className="capitalize font-medium text-foreground">
                    {purchaseSuccessData.billingCycle}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Payment ID</span>
                  <span className="font-mono text-[11px] text-muted-foreground select-all">
                    {purchaseSuccessData.paymentId}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono text-[11px] text-muted-foreground select-all">
                    {purchaseSuccessData.orderId}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <span className="text-muted-foreground">Status</span>
                  <span className="flex items-center gap-1 font-semibold text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed & Active
                  </span>
                </div>
              </div>
            )}

            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              onClick={() => setPurchaseSuccessData(null)}
            >
              Start Using Features
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <DashboardShell>
      <SubscriptionContent />
    </DashboardShell>
  );
}
