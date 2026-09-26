import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CustomOverrides, Plan } from '@/lib/subscription/types';

// ── GET /api/subscription ──────────────────────────────────────────
// Returns current account subscription, active plan, usage stats, and all available plans.
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find user's profile to get account_id
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, account_id, account_role, is_super_admin')
    .eq('user_id', user.id)
    .single();

  if (profileErr || !profile?.account_id) {
    return NextResponse.json({ error: 'No account linked to user' }, { status: 400 });
  }

  const accountId = profile.account_id;

  // Best-effort auto-expire stale subscriptions
  try {
    await supabase.rpc('expire_subscriptions');
  } catch (e) {
    // Ignore if function not yet migrated
  }

  // 1. Fetch all available plans (excluding deprecated Scale plan)
  const { data: plansData, error: plansErr } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .neq('name', 'Scale')
    .order('sort_order', { ascending: true });

  const allPlans: Plan[] = (plansData ?? []).filter((p) => p.name !== 'Scale');

  // 2. Fetch current subscription for this account
  const { data: subData, error: subErr } = await supabase
    .from('subscriptions')
    .select(`
      id,
      account_id,
      plan_id,
      status,
      start_date,
      end_date,
      notes,
      billing_cycle,
      is_trial,
      custom_overrides,
      plans (*)
    `)
    .eq('account_id', accountId)
    .maybeSingle();

  let subscription = subData;

  // If no subscription exists, auto-assign Free 7-Day Trial Plan if Free Plan exists
  if (!subscription) {
    const freePlan = allPlans.find(p => p.name === 'Free Plan' || p.is_trial);
    if (freePlan) {
      const now = new Date();
      const trialDays = freePlan.trial_days || 7;
      const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

      const { data: newSub } = await supabase
        .from('subscriptions')
        .insert({
          account_id: accountId,
          plan_id: freePlan.id,
          status: 'active',
          is_trial: true,
          billing_cycle: 'monthly',
          start_date: now.toISOString(),
          end_date: trialEnd.toISOString(),
          notes: 'Auto-provisioned 7-day free trial',
          created_by: user.id,
        })
        .select(`
          id,
          account_id,
          plan_id,
          status,
          start_date,
          end_date,
          notes,
          billing_cycle,
          is_trial,
          custom_overrides,
          plans (*)
        `)
        .maybeSingle();

      if (newSub) {
        subscription = newSub;
      }
    }
  }

  // 3. Count current usage metrics
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    contactsCountRes,
    campaignsCountRes,
    flowsCountRes,
    teamMembersCountRes,
    customFieldsCountRes,
  ] = await Promise.all([
    supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('account_id', accountId),
    supabase.from('broadcasts').select('id', { count: 'exact', head: true }).eq('account_id', accountId).gte('created_at', startOfMonth),
    supabase.from('flows').select('id', { count: 'exact', head: true }).eq('account_id', accountId),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('account_id', accountId),
    supabase.from('custom_fields').select('id', { count: 'exact', head: true }).eq('account_id', accountId),
  ]);

  const contactsUsed = contactsCountRes.count ?? 0;
  const campaignsUsed = campaignsCountRes.count ?? 0;
  const flowsUsed = flowsCountRes.count ?? 0;
  const teamMembersUsed = Math.max(0, (teamMembersCountRes.count ?? 1) - 1); // Extra members beyond owner
  const customFieldsUsed = customFieldsCountRes.count ?? 0;

  // Active plan & overrides
  const activePlan: Plan | null = (subscription?.plans as unknown as Plan) ?? allPlans.find(p => p.id === subscription?.plan_id) ?? null;
  const overrides: CustomOverrides = (subscription?.custom_overrides as CustomOverrides) || {};

  // Compute effective limits (overrides win if defined)
  const getEffectiveLimit = (overrideVal: number | null | undefined, planVal: number | null | undefined, defaultVal: number) => {
    if (overrideVal !== undefined && overrideVal !== null) return overrideVal;
    if (planVal !== undefined && planVal !== null) return planVal;
    return defaultVal;
  };

  const getEffectiveBool = (overrideVal: boolean | undefined, planVal: boolean | undefined, defaultVal: boolean) => {
    if (overrideVal !== undefined) return overrideVal;
    if (planVal !== undefined) return planVal;
    return defaultVal;
  };

  const maxContacts = getEffectiveLimit(overrides.contacts_limit, activePlan?.contacts_limit ?? activePlan?.customer_limit, 10);
  const maxCampaigns = getEffectiveLimit(overrides.campaigns_limit, activePlan?.campaigns_limit, 1);
  const maxFlows = getEffectiveLimit(overrides.bot_flows_limit, activePlan?.bot_flows_limit, 1);
  const maxReplies = getEffectiveLimit(overrides.bot_replies_limit, activePlan?.bot_replies_limit, 1);
  const maxCustomFields = getEffectiveLimit(overrides.custom_fields_limit, activePlan?.custom_fields_limit, 0);
  const maxTeamMembers = getEffectiveLimit(overrides.team_members_limit, activePlan?.team_members_limit, 0);

  const aiChatBot = getEffectiveBool(overrides.ai_bot_access, activePlan?.ai_bot_access, false);
  const apiWebhookAccess = getEffectiveBool(overrides.api_webhook_access, activePlan?.api_webhook_access, false);
  const whatsappCallingApi = getEffectiveBool(overrides.whatsapp_calling_api, activePlan?.whatsapp_calling_api, true);

  // Time & Status
  const endDateMs = subscription?.end_date ? new Date(subscription.end_date).getTime() : 0;
  const isExpired = subscription ? (subscription.status === 'expired' || (endDateMs > 0 && endDateMs < Date.now())) : false;
  const daysRemaining = endDateMs ? Math.max(0, Math.ceil((endDateMs - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
  const isTrial = Boolean(subscription?.is_trial);

  const limits = {
    contacts: {
      used: contactsUsed,
      max: maxContacts,
      unlimited: maxContacts === -1,
      allowed: maxContacts === -1 || contactsUsed < maxContacts,
      remaining: maxContacts === -1 ? Infinity : Math.max(0, maxContacts - contactsUsed),
    },
    campaigns: {
      used: campaignsUsed,
      max: maxCampaigns,
      unlimited: maxCampaigns === -1,
      allowed: maxCampaigns === -1 || campaignsUsed < maxCampaigns,
      remaining: maxCampaigns === -1 ? Infinity : Math.max(0, maxCampaigns - campaignsUsed),
    },
    botFlows: {
      used: flowsUsed,
      max: maxFlows,
      unlimited: maxFlows === -1,
      allowed: maxFlows === -1 || flowsUsed < maxFlows,
      remaining: maxFlows === -1 ? Infinity : Math.max(0, maxFlows - flowsUsed),
    },
    botReplies: {
      used: 0,
      max: maxReplies,
      unlimited: maxReplies === -1,
      allowed: true,
      remaining: maxReplies === -1 ? Infinity : maxReplies,
    },
    customFields: {
      used: customFieldsUsed,
      max: maxCustomFields,
      unlimited: maxCustomFields === -1,
      allowed: maxCustomFields === -1 || customFieldsUsed < maxCustomFields,
      remaining: maxCustomFields === -1 ? Infinity : Math.max(0, maxCustomFields - customFieldsUsed),
    },
    teamMembers: {
      used: teamMembersUsed,
      max: maxTeamMembers,
      unlimited: maxTeamMembers === -1,
      allowed: maxTeamMembers === -1 || teamMembersUsed < maxTeamMembers,
      remaining: maxTeamMembers === -1 ? Infinity : Math.max(0, maxTeamMembers - teamMembersUsed),
    },
    aiChatBot,
    apiWebhookAccess,
    whatsappCallingApi,
  };

  return NextResponse.json({
    subscription,
    plan: activePlan,
    plans: allPlans,
    isActive: subscription?.status === 'active' && !isExpired,
    isTrial,
    isExpired,
    daysRemaining,
    limits,
    isSuperAdmin: Boolean(profile.is_super_admin),
    userRole: profile.account_role,
  });
}

// ── POST /api/subscription ─────────────────────────────────────────
// Users can subscribe / upgrade plan or activate free 7-day trial.
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, account_id, account_role, is_super_admin')
    .eq('user_id', user.id)
    .single();

  if (!profile?.account_id) {
    return NextResponse.json({ error: 'No account linked' }, { status: 400 });
  }

  // Only owner or admin can subscribe
  if (profile.account_role !== 'owner' && profile.account_role !== 'admin' && !profile.is_super_admin) {
    return NextResponse.json({ error: 'Only account owners and admins can manage subscriptions' }, { status: 403 });
  }

  const body = await request.json();
  const { plan_id, billing_cycle = 'monthly', is_trial_request = false } = body;

  if (!plan_id) {
    return NextResponse.json({ error: 'Plan is required' }, { status: 400 });
  }

  // Fetch target plan
  const { data: targetPlan, error: planErr } = await supabase
    .from('plans')
    .select('*')
    .eq('id', plan_id)
    .single();

  if (planErr || !targetPlan) {
    return NextResponse.json({ error: 'Selected plan not found' }, { status: 404 });
  }

  const now = new Date();
  let endDate = new Date(now);
  let isTrial = false;

  if (targetPlan.is_trial || is_trial_request) {
    isTrial = true;
    const days = targetPlan.trial_days || 7;
    endDate.setDate(endDate.getDate() + days);
  } else if (billing_cycle === 'yearly') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  // Upsert subscription for this account
  const { data: newSub, error: subErr } = await supabase
    .from('subscriptions')
    .upsert(
      {
        account_id: profile.account_id,
        plan_id: targetPlan.id,
        status: 'active',
        is_trial: isTrial,
        billing_cycle: billing_cycle === 'yearly' ? 'yearly' : 'monthly',
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
        notes: isTrial ? '7-day free trial activated' : `Subscribed to ${targetPlan.name} (${billing_cycle})`,
        created_by: user.id,
      },
      { onConflict: 'account_id' },
    )
    .select(`
      id,
      account_id,
      plan_id,
      status,
      start_date,
      end_date,
      notes,
      billing_cycle,
      is_trial,
      custom_overrides,
      plans (*)
    `)
    .single();

  if (subErr) {
    console.error('Subscription update failed:', subErr);
    return NextResponse.json({ error: subErr.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: isTrial ? '7-Day Free Trial activated successfully!' : `Subscribed to ${targetPlan.name} successfully!`,
    subscription: newSub,
  });
}
