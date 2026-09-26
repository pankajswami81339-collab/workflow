'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Users,
  Crown,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Loader2,
  CalendarDays,
  ShieldAlert,
  Sliders,
  Sparkles,
  Bot,
  Webhook,
  PhoneCall,
  Check,
  X,
  FileText,
  Shield,
  Zap,
  Workflow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { Plan, CustomOverrides } from '@/lib/subscription/types';

// ── Types ─────────────────────────────────────────────────────────
type AdminSubscription = {
  id: string;
  status: 'active' | 'expired' | 'cancelled';
  start_date: string;
  end_date: string;
  notes: string | null;
  is_trial?: boolean;
  billing_cycle?: 'monthly' | 'yearly';
  custom_overrides?: CustomOverrides | null;
  plans: Plan | null;
};

type AdminAccount = {
  id: string;
  name: string;
  created_at: string;
  owner_user_id: string;
  profiles: {
    full_name: string;
    email: string;
    is_super_admin: boolean;
  } | null;
  subscriptions: AdminSubscription[] | null;
  usage?: {
    contactsCount: number;
    campaignsCount: number;
    flowsCount: number;
    teamMembersCount: number;
  };
};

function daysLeft(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function StatusBadge({ sub }: { sub?: AdminSubscription | null }) {
  if (!sub) {
    return <Badge className="bg-slate-800 text-slate-400 border-slate-700">No Plan</Badge>;
  }

  const isExpired = sub.status === 'expired' || new Date(sub.end_date).getTime() < Date.now();

  if (isExpired) {
    return <Badge className="bg-red-500/15 text-red-400 border-red-500/30">Expired</Badge>;
  }

  if (sub.is_trial) {
    return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">Free Trial</Badge>;
  }

  if (sub.status === 'active') {
    return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Active</Badge>;
  }

  return <Badge className="bg-slate-500/15 text-slate-400 border-slate-500/30">Cancelled</Badge>;
}

function PlanBadge({ plan, isTrial }: { plan?: Plan | null; isTrial?: boolean }) {
  if (isTrial || plan?.name === 'Free Plan' || plan?.is_trial) {
    return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">Free Plan</Badge>;
  }
  const name = plan?.name || 'No Plan';
  const color =
    name.includes('Enterprise')
      ? 'bg-violet-500/15 text-violet-400 border-violet-500/30'
      : name.includes('Growth')
      ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
      : name.includes('Starter')
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      : 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  return <Badge className={color}>{name}</Badge>;
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Edit / Assign Modal state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'plan' | 'access'>('plan');
  const [dialogAccount, setDialogAccount] = useState<AdminAccount | null>(null);

  // Plan tab fields
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'expired' | 'cancelled'>('active');
  const [isTrial, setIsTrial] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  // Access / Limits tab fields (Admin Granular Control)
  const [contactsLimit, setContactsLimit] = useState<number | ''>(10);
  const [contactsUnlimited, setContactsUnlimited] = useState(false);

  const [campaignsLimit, setCampaignsLimit] = useState<number | ''>(1);
  const [campaignsUnlimited, setCampaignsUnlimited] = useState(false);

  const [botFlowsLimit, setBotFlowsLimit] = useState<number | ''>(1);
  const [botFlowsUnlimited, setBotFlowsUnlimited] = useState(false);

  const [botRepliesLimit, setBotRepliesLimit] = useState<number | ''>(1);
  const [botRepliesUnlimited, setBotRepliesUnlimited] = useState(false);

  const [customFieldsLimit, setCustomFieldsLimit] = useState<number | ''>(0);
  const [customFieldsUnlimited, setCustomFieldsUnlimited] = useState(false);

  const [teamMembersLimit, setTeamMembersLimit] = useState<number | ''>(0);
  const [teamMembersUnlimited, setTeamMembersUnlimited] = useState(false);

  const [aiBotAccess, setAiBotAccess] = useState(false);
  const [apiWebhookAccess, setApiWebhookAccess] = useState(false);
  const [whatsappCallingApi, setWhatsappCallingApi] = useState(true);

  const [saving, setSaving] = useState(false);

  // ── Auth guard ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      const { data: p } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('user_id', user.id)
        .single();
      if (!p?.is_super_admin) {
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }
      setIsSuperAdmin(true);
    })();
  }, [router, supabase]);

  // ── Fetch data ──────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [accRes, planRes] = await Promise.all([
        fetch('/api/admin/subscriptions'),
        supabase.from('plans').select('*').neq('name', 'Scale').order('sort_order', { ascending: true }),
      ]);
      const accData = await accRes.json();
      if (accRes.ok) setAccounts(accData.accounts ?? []);
      else toast.error(accData.error ?? 'Failed to load accounts');

      if (!planRes.error) {
        setPlans((planRes.data ?? []).filter((p) => p.name !== 'Scale'));
      }
    } catch (e) {
      toast.error('Network error loading admin data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (isSuperAdmin) fetchData();
  }, [isSuperAdmin, fetchData]);

  // ── Stats ────────────────────────────────────────────────────────
  const totalAccounts = accounts.length;
  const activeSubs = accounts.filter((a) => {
    const s = a.subscriptions?.[0];
    return s?.status === 'active' && !s.is_trial && daysLeft(s.end_date) > 0;
  }).length;

  const trialSubs = accounts.filter((a) => {
    const s = a.subscriptions?.[0];
    return s?.status === 'active' && s.is_trial && daysLeft(s.end_date) > 0;
  }).length;

  const expiredSubs = accounts.filter((a) => {
    const s = a.subscriptions?.[0];
    return s?.status === 'expired' || (s && daysLeft(s.end_date) <= 0);
  }).length;

  const mrr = accounts.reduce((sum, a) => {
    const sub = a.subscriptions?.[0];
    if (sub?.status === 'active' && !sub.is_trial && sub.plans) {
      return sum + (sub.plans.price_monthly_inr || sub.plans.price_inr || 0);
    }
    return sum;
  }, 0);

  // ── Filtering ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return accounts.filter((a) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.profiles?.email?.toLowerCase().includes(q) ||
        a.profiles?.full_name?.toLowerCase().includes(q);

      const sub = a.subscriptions?.[0];
      const isExpired = sub ? sub.status === 'expired' || daysLeft(sub.end_date) <= 0 : false;
      const isTrialSub = sub ? sub.status === 'active' && sub.is_trial && !isExpired : false;
      const isActivePaid = sub ? sub.status === 'active' && !sub.is_trial && !isExpired : false;

      const matchStatus =
        filterStatus === 'all'
          ? true
          : filterStatus === 'active'
          ? isActivePaid
          : filterStatus === 'trial'
          ? isTrialSub
          : filterStatus === 'expired'
          ? isExpired
          : filterStatus === 'cancelled'
          ? sub?.status === 'cancelled'
          : filterStatus === 'none'
          ? !sub
          : true;

      return matchSearch && matchStatus;
    });
  }, [accounts, search, filterStatus]);

  // ── Open Assign & Edit Dialog ────────────────────────────────────
  function openManageDialog(acc: AdminAccount) {
    setDialogAccount(acc);
    setActiveTab('plan');

    const sub = acc.subscriptions?.[0];
    const plan = sub?.plans || plans.find((p) => p.name === 'Free Plan') || plans[0];
    const overrides = sub?.custom_overrides || {};

    setSelectedPlanId(plan?.id ?? '');
    setSubscriptionStatus(sub?.status ?? 'active');
    setIsTrial(Boolean(sub?.is_trial));
    setBillingCycle(sub?.billing_cycle ?? 'monthly');

    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    setStartDate(sub?.start_date ? sub.start_date.slice(0, 10) : now.toISOString().slice(0, 10));
    setEndDate(sub?.end_date ? sub.end_date.slice(0, 10) : nextMonth.toISOString().slice(0, 10));
    setNotes(sub?.notes ?? '');

    // Initialize limits & toggles (with override priority)
    const effContacts = overrides.contacts_limit !== undefined ? overrides.contacts_limit : (plan?.contacts_limit ?? 10);
    setContactsUnlimited(effContacts === -1);
    setContactsLimit(effContacts === -1 ? '' : (effContacts ?? 10));

    const effCampaigns = overrides.campaigns_limit !== undefined ? overrides.campaigns_limit : (plan?.campaigns_limit ?? 1);
    setCampaignsUnlimited(effCampaigns === -1);
    setCampaignsLimit(effCampaigns === -1 ? '' : (effCampaigns ?? 1));

    const effFlows = overrides.bot_flows_limit !== undefined ? overrides.bot_flows_limit : (plan?.bot_flows_limit ?? 1);
    setBotFlowsUnlimited(effFlows === -1);
    setBotFlowsLimit(effFlows === -1 ? '' : (effFlows ?? 1));

    const effReplies = overrides.bot_replies_limit !== undefined ? overrides.bot_replies_limit : (plan?.bot_replies_limit ?? 1);
    setBotRepliesUnlimited(effReplies === -1);
    setBotRepliesLimit(effReplies === -1 ? '' : (effReplies ?? 1));

    const effCustomFields = overrides.custom_fields_limit !== undefined ? overrides.custom_fields_limit : (plan?.custom_fields_limit ?? 0);
    setCustomFieldsUnlimited(effCustomFields === -1);
    setCustomFieldsLimit(effCustomFields === -1 ? '' : (effCustomFields ?? 0));

    const effTeamMembers = overrides.team_members_limit !== undefined ? overrides.team_members_limit : (plan?.team_members_limit ?? 0);
    setTeamMembersUnlimited(effTeamMembers === -1);
    setTeamMembersLimit(effTeamMembers === -1 ? '' : (effTeamMembers ?? 0));

    setAiBotAccess(overrides.ai_bot_access !== undefined ? overrides.ai_bot_access : Boolean(plan?.ai_bot_access));
    setApiWebhookAccess(overrides.api_webhook_access !== undefined ? overrides.api_webhook_access : Boolean(plan?.api_webhook_access));
    setWhatsappCallingApi(overrides.whatsapp_calling_api !== undefined ? overrides.whatsapp_calling_api : (plan?.whatsapp_calling_api !== false));

    setDialogOpen(true);
  }

  // When admin selects another plan in dropdown, update suggested defaults
  function handlePlanSelectionChange(newPlanId: string) {
    setSelectedPlanId(newPlanId);
    const chosenPlan = plans.find((p) => p.id === newPlanId);
    if (!chosenPlan) return;

    if (chosenPlan.is_trial || chosenPlan.name === 'Free Plan') {
      setIsTrial(true);
      const s = new Date(startDate || new Date());
      const e = new Date(s);
      e.setDate(e.getDate() + (chosenPlan.trial_days || 7));
      setEndDate(e.toISOString().slice(0, 10));
    } else {
      setIsTrial(false);
    }

    // Update limits based on chosen plan
    const cLim = chosenPlan.contacts_limit ?? 10;
    setContactsUnlimited(cLim === -1);
    setContactsLimit(cLim === -1 ? '' : cLim);

    const campLim = chosenPlan.campaigns_limit ?? 1;
    setCampaignsUnlimited(campLim === -1);
    setCampaignsLimit(campLim === -1 ? '' : campLim);

    const flLim = chosenPlan.bot_flows_limit ?? 1;
    setBotFlowsUnlimited(flLim === -1);
    setBotFlowsLimit(flLim === -1 ? '' : flLim);

    const repLim = chosenPlan.bot_replies_limit ?? 1;
    setBotRepliesUnlimited(repLim === -1);
    setBotRepliesLimit(repLim === -1 ? '' : repLim);

    const cfLim = chosenPlan.custom_fields_limit ?? 0;
    setCustomFieldsUnlimited(cfLim === -1);
    setCustomFieldsLimit(cfLim === -1 ? '' : cfLim);

    const tmLim = chosenPlan.team_members_limit ?? 0;
    setTeamMembersUnlimited(tmLim === -1);
    setTeamMembersLimit(tmLim === -1 ? '' : tmLim);

    setAiBotAccess(Boolean(chosenPlan.ai_bot_access));
    setApiWebhookAccess(Boolean(chosenPlan.api_webhook_access));
    setWhatsappCallingApi(chosenPlan.whatsapp_calling_api !== false);
  }

  // ── Save Subscription & Access Changes ───────────────────────────
  async function handleSave() {
    if (!dialogAccount || !selectedPlanId) {
      toast.error('Select a plan');
      return;
    }

    setSaving(true);
    try {
      const custom_overrides: CustomOverrides = {
        contacts_limit: contactsUnlimited ? -1 : contactsLimit === '' ? 10 : Number(contactsLimit),
        campaigns_limit: campaignsUnlimited ? -1 : campaignsLimit === '' ? 1 : Number(campaignsLimit),
        bot_flows_limit: botFlowsUnlimited ? -1 : botFlowsLimit === '' ? 1 : Number(botFlowsLimit),
        bot_replies_limit: botRepliesUnlimited ? -1 : botRepliesLimit === '' ? 1 : Number(botRepliesLimit),
        custom_fields_limit: customFieldsUnlimited ? -1 : customFieldsLimit === '' ? 0 : Number(customFieldsLimit),
        team_members_limit: teamMembersUnlimited ? -1 : teamMembersLimit === '' ? 0 : Number(teamMembersLimit),
        ai_bot_access: aiBotAccess,
        api_webhook_access: apiWebhookAccess,
        whatsapp_calling_api: whatsappCallingApi,
      };

      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: dialogAccount.id,
          plan_id: selectedPlanId,
          status: subscriptionStatus,
          is_trial: isTrial,
          billing_cycle: billingCycle,
          start_date: startDate,
          end_date: endDate,
          notes,
          custom_overrides,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to update subscription');
        return;
      }

      toast.success(`Subscription and access updated for ${dialogAccount.name}`);
      setDialogOpen(false);
      await fetchData();
    } catch (e) {
      toast.error('Network error during save');
    } finally {
      setSaving(false);
    }
  }

  // Quick Trial extension
  async function handleQuickExtendTrial(acc: AdminAccount, days: number) {
    const sub = acc.subscriptions?.[0];
    const freePlan = plans.find((p) => p.name === 'Free Plan' || p.is_trial) || plans[0];
    const planId = sub?.plans?.id || freePlan?.id;
    if (!planId) return;

    const baseDate = sub?.end_date && new Date(sub.end_date).getTime() > Date.now()
      ? new Date(sub.end_date)
      : new Date();

    baseDate.setDate(baseDate.getDate() + days);

    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: acc.id,
          plan_id: planId,
          status: 'active',
          is_trial: true,
          end_date: baseDate.toISOString(),
          notes: `Extended trial by +${days} days by admin`,
        }),
      });

      if (res.ok) {
        toast.success(`Extended trial by +${days} days for ${acc.name}`);
        await fetchData();
      } else {
        toast.error('Failed to extend trial');
      }
    } catch (e) {
      toast.error('Error extending trial');
    }
  }

  async function handleCancelSub(account: AdminAccount) {
    if (!confirm(`Cancel subscription for "${account.name}"?`)) return;
    const res = await fetch(`/api/admin/subscriptions?account_id=${account.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Subscription cancelled');
      await fetchData();
    } else {
      toast.error('Failed to cancel');
    }
  }

  // ── Loading & Guard States ───────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (isSuperAdmin === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-slate-100">
        <ShieldAlert className="h-14 w-14 text-red-400" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-slate-400">You do not have super-admin permissions.</p>
        <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ── Top Navigation Bar ──────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto max-w-7xl flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-md shadow-emerald-500/20">
              <Crown className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-100 flex items-center gap-2">
                Super Admin Control Panel
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                  Master Admin
                </Badge>
              </h1>
              <p className="text-xs text-slate-400">Subscriptions, Resource Limits & User Privileges</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchData}
              disabled={refreshing}
              className="text-slate-400 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/subscription')}
              className="border-slate-700 text-slate-300 hover:text-white text-xs"
            >
              Client View
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="text-slate-400 hover:text-white text-xs"
            >
              Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
        {/* ── Metric Cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Accounts</p>
                <Users className="h-4 w-4 text-slate-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-100">{totalAccounts}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Paid Active</p>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-400">{activeSubs}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">7-Day Free Trials</p>
                <Sparkles className="h-4 w-4 text-amber-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-amber-400">{trialSubs}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Expired / Due</p>
                <AlertCircle className="h-4 w-4 text-red-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-red-400">{expiredSubs}</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">MRR Revenue</p>
                <TrendingUp className="h-4 w-4 text-teal-400" />
              </div>
              <p className="mt-2 text-2xl font-bold text-teal-400">
                ₹{mrr.toLocaleString('en-IN')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Available Plans Overview ─────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Subscription Tiers & Feature Limits
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            {plans.map((plan) => {
              const count = accounts.filter(
                (a) => a.subscriptions?.[0]?.plans?.id === plan.id && a.subscriptions?.[0]?.status === 'active'
              ).length;

              return (
                <Card key={plan.id} className="bg-slate-900 border-slate-800">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-slate-100">{plan.name}</CardTitle>
                      <PlanBadge plan={plan} isTrial={plan.is_trial} />
                    </div>
                    <CardDescription className="text-xs text-slate-400">
                      <span className="text-lg font-bold text-slate-100">
                        ₹{(plan.price_monthly_inr || plan.price_inr).toLocaleString('en-IN')}
                      </span>
                      <span className="text-slate-500"> / mo</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1.5 text-xs text-slate-400">
                    <p className="text-emerald-400 font-medium">
                      {plan.contacts_limit === -1 ? 'Unlimited Contacts' : `${plan.contacts_limit} Contacts`}
                    </p>
                    <p>{plan.campaigns_limit === -1 ? 'Unlimited Campaigns' : `${plan.campaigns_limit} Campaigns/mo`}</p>
                    <p>{plan.bot_flows_limit === -1 ? 'Unlimited Flows' : `${plan.bot_flows_limit} Bot Flows`}</p>
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                      <span>AI Bot: {plan.ai_bot_access ? '✔️' : '❌'}</span>
                      <span>API: {plan.api_webhook_access ? '✔️' : '❌'}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Subscribers</span>
                      <Badge className="bg-slate-800 text-slate-300 text-[10px]">{count} active</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* ── Accounts & Access Management Table ────────────────────── */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                User Accounts & Access Management
              </h2>
              <p className="text-xs text-slate-500">
                View user data, subscription status, and grant/modify specific platform privileges.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <Input
                  placeholder="Search user, email, or account…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 bg-slate-900 border-slate-700 text-slate-100 text-xs placeholder:text-slate-600"
                />
              </div>
              <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val ?? 'all')}>
                <SelectTrigger className="w-36 h-9 bg-slate-900 border-slate-700 text-slate-100 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-slate-100 text-xs">
                  <SelectItem value="all">All Accounts</SelectItem>
                  <SelectItem value="active">Active Paid</SelectItem>
                  <SelectItem value="trial">7-Day Free Trial</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="none">No Plan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            {/* Table Header */}
            <div className="hidden lg:grid grid-cols-[1.4fr_1.2fr_1.3fr_1.2fr_1fr_160px] gap-4 px-5 py-3 bg-slate-900/80 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Account & User Details</span>
              <span>Resource Usage</span>
              <span>Subscription & Plan</span>
              <span>Validity & Period</span>
              <span>Active Privileges</span>
              <span className="text-right">Admin Actions</span>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <Users className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">No accounts found matching search.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {filtered.map((acc) => {
                  const sub = acc.subscriptions?.[0];
                  const plan = sub?.plans;
                  const overrides = sub?.custom_overrides || {};
                  const isExp = sub ? sub.status === 'expired' || daysLeft(sub.end_date) <= 0 : false;
                  const days = sub ? daysLeft(sub.end_date) : 0;

                  // Active privileges for this account
                  const hasAi = overrides.ai_bot_access !== undefined ? overrides.ai_bot_access : Boolean(plan?.ai_bot_access);
                  const hasApi = overrides.api_webhook_access !== undefined ? overrides.api_webhook_access : Boolean(plan?.api_webhook_access);
                  const hasCalling = overrides.whatsapp_calling_api !== undefined ? overrides.whatsapp_calling_api : (plan?.whatsapp_calling_api !== false);

                  return (
                    <div
                      key={acc.id}
                      className="grid grid-cols-1 lg:grid-cols-[1.4fr_1.2fr_1.3fr_1.2fr_1fr_160px] gap-3 lg:gap-4 px-5 py-4 items-start lg:items-center hover:bg-slate-900/70 transition-colors"
                    >
                      {/* Account & User Details */}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-slate-100 truncate">{acc.name}</p>
                          {acc.profiles?.is_super_admin && (
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[9px] px-1 py-0">
                              Admin
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">{acc.profiles?.full_name || 'No Name'}</p>
                        <p className="text-xs text-slate-400 truncate">{acc.profiles?.email || '—'}</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">Joined {fmtDate(acc.created_at)}</p>
                      </div>

                      {/* Usage */}
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Users className="h-3 w-3 text-slate-500" />
                          <span>Contacts: </span>
                          <span className="font-semibold text-slate-100">{acc.usage?.contactsCount ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Zap className="h-3 w-3 text-slate-500" />
                          <span>Campaigns: </span>
                          <span className="font-semibold text-slate-100">{acc.usage?.campaignsCount ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Workflow className="h-3 w-3 text-slate-500" />
                          <span>Flows: </span>
                          <span className="font-semibold text-slate-100">{acc.usage?.flowsCount ?? 0}</span>
                        </div>
                      </div>

                      {/* Subscription & Plan */}
                      <div>
                        <div className="flex items-center gap-2">
                          <PlanBadge plan={plan} isTrial={sub?.is_trial} />
                          <StatusBadge sub={sub} />
                        </div>
                        {plan && !sub?.is_trial && (
                          <p className="text-xs text-slate-400 mt-1">
                            ₹{(plan.price_monthly_inr || plan.price_inr).toLocaleString('en-IN')} / mo
                            {sub?.billing_cycle === 'yearly' && ' (Yearly)'}
                          </p>
                        )}
                        {sub?.notes && (
                          <p className="text-[10px] text-slate-500 mt-1 truncate" title={sub.notes}>
                            Note: {sub.notes}
                          </p>
                        )}
                      </div>

                      {/* Period & Validity */}
                      <div>
                        {sub ? (
                          <div className="text-xs space-y-1">
                            <p className="text-slate-300 flex items-center gap-1">
                              <CalendarDays className="h-3 w-3 text-slate-500" />
                              {fmtDate(sub.start_date)} → {fmtDate(sub.end_date)}
                            </p>
                            <p
                              className={`text-[11px] font-medium flex items-center gap-1 ${
                                isExp ? 'text-red-400' : days <= 3 ? 'text-amber-400' : 'text-emerald-400'
                              }`}
                            >
                              <Clock className="h-3 w-3" />
                              {isExp
                                ? 'Expired'
                                : `${days} ${days === 1 ? 'day' : 'days'} left`}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </div>

                      {/* Main Privileges Granted */}
                      <div className="flex flex-wrap gap-1.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium flex items-center gap-1 ${
                            hasAi
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-slate-800 text-slate-600 line-through'
                          }`}
                        >
                          <Bot className="h-2.5 w-2.5" /> AI
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium flex items-center gap-1 ${
                            hasApi
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-slate-800 text-slate-600 line-through'
                          }`}
                        >
                          <Webhook className="h-2.5 w-2.5" /> API
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium flex items-center gap-1 ${
                            hasCalling
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-600 line-through'
                          }`}
                        >
                          <PhoneCall className="h-2.5 w-2.5" /> Call
                        </span>
                      </div>

                      {/* Admin Actions */}
                      <div className="flex items-center gap-1.5 lg:justify-end">
                        <Button
                          size="sm"
                          onClick={() => openManageDialog(acc)}
                          className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                        >
                          <Sliders className="h-3 w-3 mr-1" />
                          Manage Access
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="+7 Days Trial Extension"
                          onClick={() => handleQuickExtendTrial(acc, 7)}
                          className="h-8 px-2 text-xs text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                        >
                          +7d
                        </Button>
                        {sub && sub.status === 'active' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Cancel subscription"
                            onClick={() => handleCancelSub(acc)}
                            className="h-8 px-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ── Comprehensive Manage Access & Subscription Modal ─────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sliders className="h-5 w-5 text-emerald-400" />
              Manage Subscription & Privileges
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Account: <span className="font-semibold text-slate-200">{dialogAccount?.name}</span> (
              {dialogAccount?.profiles?.email})
            </DialogDescription>
          </DialogHeader>

          {/* Tab Switcher */}
          <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-1 mt-2">
            <button
              type="button"
              onClick={() => setActiveTab('plan')}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'plan'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1. Plan & Validity Period
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('access')}
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'access'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2. User Access & Custom Limits
            </button>
          </div>

          {activeTab === 'plan' ? (
            /* ── Tab 1: Plan & Time Period ── */
            <div className="space-y-4 py-3">
              <div className="grid grid-cols-2 gap-4">
                {/* Select Plan */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Subscription Tier</Label>
                  <Select value={selectedPlanId} onValueChange={(val) => handlePlanSelectionChange(val ?? '')}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 text-xs h-9">
                      <SelectValue placeholder="Select Plan" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-slate-100 text-xs">
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — ₹{(p.price_monthly_inr || p.price_inr).toLocaleString('en-IN')}/mo
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Status</Label>
                  <Select
                    value={subscriptionStatus}
                    onValueChange={(val) => setSubscriptionStatus(val as 'active' | 'expired' | 'cancelled')}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-slate-100 text-xs">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Free Trial toggle & Billing Cycle */}
              <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-200">7-Day Free Trial Flag</p>
                    <p className="text-[10px] text-slate-500">Mark account as being in free trial</p>
                  </div>
                  <Switch checked={isTrial} onCheckedChange={setIsTrial} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-200">Billing Cycle</p>
                    <p className="text-[10px] text-slate-500">Monthly vs Yearly</p>
                  </div>
                  <Select
                    value={billingCycle}
                    onValueChange={(v) => setBillingCycle(v as 'monthly' | 'yearly')}
                  >
                    <SelectTrigger className="w-28 h-8 bg-slate-800 border-slate-700 text-slate-100 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-slate-100 text-xs">
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-slate-100 text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">End Date (Expiration)</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-slate-100 text-xs h-9"
                  />
                </div>
              </div>

              {/* Quick Period Presets */}
              <div className="space-y-1.5">
                <p className="text-[11px] text-slate-400 font-medium">Quick Extend Period Presets:</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                    onClick={() => {
                      setIsTrial(true);
                      const s = new Date(startDate || new Date());
                      const e = new Date(s);
                      e.setDate(e.getDate() + 7);
                      setEndDate(e.toISOString().slice(0, 10));
                    }}
                  >
                    +7 Days (Trial)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
                    onClick={() => {
                      const s = new Date(startDate || new Date());
                      const e = new Date(s);
                      e.setDate(e.getDate() + 14);
                      setEndDate(e.toISOString().slice(0, 10));
                    }}
                  >
                    +14 Days
                  </Button>
                  {[1, 3, 6, 12].map((m) => (
                    <Button
                      key={m}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
                      onClick={() => {
                        const s = new Date(startDate || new Date());
                        const e = new Date(s);
                        e.setMonth(e.getMonth() + m);
                        setEndDate(e.toISOString().slice(0, 10));
                      }}
                    >
                      +{m} {m === 1 ? 'Month' : 'Months'}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Admin Notes / Payment Reference</Label>
                <Textarea
                  placeholder="e.g., Paid via Bank Transfer, Custom enterprise onboarding, Special promo..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-100 text-xs placeholder:text-slate-600 resize-none"
                  rows={2}
                />
              </div>
            </div>
          ) : (
            /* ── Tab 2: User Access & Custom Limits Controls ── */
            <div className="space-y-4 py-3">
              <p className="text-xs text-slate-400">
                Configure the specific resource limits and access features granted to this user. Overrides will take priority over plan defaults.
              </p>

              {/* Feature Switches */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* AI Chat Bot */}
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Bot className="h-4 w-4 text-purple-400" />
                      <span className="text-xs font-semibold text-slate-200">AI Chat Bot</span>
                    </div>
                    <Switch checked={aiBotAccess} onCheckedChange={setAiBotAccess} />
                  </div>
                  <p className="text-[10px] text-slate-500">Allow AI automated replies & agent tools</p>
                </div>

                {/* API & Webhooks */}
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Webhook className="h-4 w-4 text-blue-400" />
                      <span className="text-xs font-semibold text-slate-200">API & Webhooks</span>
                    </div>
                    <Switch checked={apiWebhookAccess} onCheckedChange={setApiWebhookAccess} />
                  </div>
                  <p className="text-[10px] text-slate-500">Generate API keys & receive live webhooks</p>
                </div>

                {/* WhatsApp Calling */}
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <PhoneCall className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-slate-200">Calling API</span>
                    </div>
                    <Switch checked={whatsappCallingApi} onCheckedChange={setWhatsappCallingApi} />
                  </div>
                  <p className="text-[10px] text-slate-500">Access to WhatsApp calling endpoints</p>
                </div>
              </div>

              {/* Resource Numeric Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Contacts Limit */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-slate-300">Contacts Limit</Label>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={contactsUnlimited}
                        onChange={(e) => setContactsUnlimited(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800 text-emerald-500"
                      />
                      Unlimited
                    </label>
                  </div>
                  <Input
                    type="number"
                    disabled={contactsUnlimited}
                    value={contactsUnlimited ? '' : contactsLimit}
                    onChange={(e) => setContactsLimit(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={contactsUnlimited ? 'Unlimited Contacts' : 'e.g. 2000'}
                    className="bg-slate-800 border-slate-700 text-slate-100 text-xs h-8"
                  />
                </div>

                {/* Campaigns Limit */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-slate-300">Monthly Campaigns</Label>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={campaignsUnlimited}
                        onChange={(e) => setCampaignsUnlimited(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800 text-emerald-500"
                      />
                      Unlimited
                    </label>
                  </div>
                  <Input
                    type="number"
                    disabled={campaignsUnlimited}
                    value={campaignsUnlimited ? '' : campaignsLimit}
                    onChange={(e) => setCampaignsLimit(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={campaignsUnlimited ? 'Unlimited Campaigns' : 'e.g. 60'}
                    className="bg-slate-800 border-slate-700 text-slate-100 text-xs h-8"
                  />
                </div>

                {/* Bot Flows Limit */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-slate-300">Bot Flows Limit</Label>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={botFlowsUnlimited}
                        onChange={(e) => setBotFlowsUnlimited(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800 text-emerald-500"
                      />
                      Unlimited
                    </label>
                  </div>
                  <Input
                    type="number"
                    disabled={botFlowsUnlimited}
                    value={botFlowsUnlimited ? '' : botFlowsLimit}
                    onChange={(e) => setBotFlowsLimit(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={botFlowsUnlimited ? 'Unlimited Flows' : 'e.g. 5'}
                    className="bg-slate-800 border-slate-700 text-slate-100 text-xs h-8"
                  />
                </div>

                {/* Bot Replies Limit */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-slate-300">Bot Replies Limit</Label>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={botRepliesUnlimited}
                        onChange={(e) => setBotRepliesUnlimited(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800 text-emerald-500"
                      />
                      Unlimited
                    </label>
                  </div>
                  <Input
                    type="number"
                    disabled={botRepliesUnlimited}
                    value={botRepliesUnlimited ? '' : botRepliesLimit}
                    onChange={(e) => setBotRepliesLimit(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={botRepliesUnlimited ? 'Unlimited Bot Replies' : 'e.g. 50'}
                    className="bg-slate-800 border-slate-700 text-slate-100 text-xs h-8"
                  />
                </div>

                {/* Custom Fields Limit */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-slate-300">Contact Custom Fields</Label>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customFieldsUnlimited}
                        onChange={(e) => setCustomFieldsUnlimited(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800 text-emerald-500"
                      />
                      Unlimited
                    </label>
                  </div>
                  <Input
                    type="number"
                    disabled={customFieldsUnlimited}
                    value={customFieldsUnlimited ? '' : customFieldsLimit}
                    onChange={(e) => setCustomFieldsLimit(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={customFieldsUnlimited ? 'Unlimited Custom Fields' : 'e.g. 5'}
                    className="bg-slate-800 border-slate-700 text-slate-100 text-xs h-8"
                  />
                </div>

                {/* Team Members Limit */}
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-slate-300">Team Members / Agents</Label>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={teamMembersUnlimited}
                        onChange={(e) => setTeamMembersUnlimited(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800 text-emerald-500"
                      />
                      Unlimited
                    </label>
                  </div>
                  <Input
                    type="number"
                    disabled={teamMembersUnlimited}
                    value={teamMembersUnlimited ? '' : teamMembersLimit}
                    onChange={(e) => setTeamMembersLimit(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={teamMembersUnlimited ? 'Unlimited Team' : 'e.g. 5'}
                    className="bg-slate-800 border-slate-700 text-slate-100 text-xs h-8"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t border-slate-800 pt-3">
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}
              Save Access & Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
