import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ── GET /api/admin/subscriptions ──────────────────────────────────
// Returns all accounts with their profile, subscription, plan, limits, and usage counts.
// Super-admin only.
export async function GET() {
  const supabase = await createClient();

  // Auth check
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden. Super admin only.' }, { status: 403 });
  }

  // Best-effort auto-expire
  try {
    await supabase.rpc('expire_subscriptions');
  } catch (e) {
    // Ignore if not present
  }

  // Fetch all accounts
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select(`
      id,
      name,
      created_at,
      owner_user_id,
      profiles!accounts_owner_user_id_fkey (
        full_name,
        email,
        is_super_admin
      ),
      subscriptions (
        id,
        status,
        start_date,
        end_date,
        notes,
        is_trial,
        billing_cycle,
        custom_overrides,
        plans (
          id,
          name,
          price_inr,
          price_monthly_inr,
          price_yearly_inr,
          customer_limit,
          contacts_limit,
          campaigns_limit,
          bot_replies_limit,
          bot_flows_limit,
          custom_fields_limit,
          team_members_limit,
          ai_bot_access,
          api_webhook_access,
          whatsapp_calling_api,
          is_trial,
          trial_days,
          features
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Admin subscriptions fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch usage stats per account (contacts count, campaigns count, flows count, team members count)
  const enhancedAccounts = await Promise.all(
    (accounts || []).map(async (acc) => {
      const [contactsRes, campaignsRes, flowsRes, membersRes] = await Promise.all([
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('account_id', acc.id),
        supabase.from('broadcasts').select('id', { count: 'exact', head: true }).eq('account_id', acc.id),
        supabase.from('flows').select('id', { count: 'exact', head: true }).eq('account_id', acc.id),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('account_id', acc.id),
      ]);

      return {
        ...acc,
        usage: {
          contactsCount: contactsRes.count ?? 0,
          campaignsCount: campaignsRes.count ?? 0,
          flowsCount: flowsRes.count ?? 0,
          teamMembersCount: Math.max(0, (membersRes.count ?? 1) - 1),
        },
      };
    })
  );

  return NextResponse.json({ accounts: enhancedAccounts });
}

// ── POST /api/admin/subscriptions ─────────────────────────────────
// Assign or update a subscription for an account, with custom overrides and privileges.
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden. Super admin only.' }, { status: 403 });
  }

  const body = await request.json();
  const {
    account_id,
    plan_id,
    status = 'active',
    start_date,
    end_date,
    is_trial = false,
    billing_cycle = 'monthly',
    notes,
    custom_overrides = {},
  } = body;

  if (!account_id || !plan_id) {
    return NextResponse.json({ error: 'account_id and plan_id are required' }, { status: 400 });
  }

  const startAt = start_date ? new Date(start_date) : new Date();
  const endAt = end_date
    ? new Date(end_date)
    : new Date(startAt.getTime() + (is_trial ? 7 : 30) * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        account_id,
        plan_id,
        status,
        is_trial: Boolean(is_trial),
        billing_cycle,
        start_date: startAt.toISOString(),
        end_date: endAt.toISOString(),
        notes: notes ?? null,
        custom_overrides: custom_overrides || {},
        created_by: user.id,
      },
      { onConflict: 'account_id' },
    )
    .select()
    .single();

  if (error) {
    console.error('Admin subscription upsert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ subscription: data });
}

// ── DELETE /api/admin/subscriptions?account_id=xxx ────────────────
// Cancel a subscription
export async function DELETE(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden. Super admin only.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('account_id');
  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 });

  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('account_id', accountId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
