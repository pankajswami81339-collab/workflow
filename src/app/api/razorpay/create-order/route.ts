import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createRazorpayOrder, RAZORPAY_KEY_ID } from '@/lib/razorpay';
import type { Plan } from '@/lib/subscription/types';

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, account_id, account_role, is_super_admin')
    .eq('user_id', user.id)
    .single();

  if (!profile?.account_id) {
    return NextResponse.json({ error: 'No account linked' }, { status: 400 });
  }

  // Only owner or admin can initiate payment
  if (
    profile.account_role !== 'owner' &&
    profile.account_role !== 'admin' &&
    !profile.is_super_admin
  ) {
    return NextResponse.json(
      { error: 'Only account owners and admins can purchase subscriptions' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { plan_id, billing_cycle = 'monthly' } = body;

  if (!plan_id) {
    return NextResponse.json({ error: 'plan_id is required' }, { status: 400 });
  }

  // Fetch plan
  const { data: plan, error: planErr } = await supabase
    .from('plans')
    .select('*')
    .eq('id', plan_id)
    .single();

  if (planErr || !plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }

  // Free trial / free plan does not need payment
  if (plan.is_trial || plan.price_inr === 0) {
    return NextResponse.json(
      { error: 'Free plan does not require payment' },
      { status: 400 }
    );
  }

  const amountInInr =
    billing_cycle === 'yearly'
      ? plan.price_yearly_inr || Math.round((plan.price_inr || 299) * 12 * 0.9)
      : plan.price_monthly_inr || plan.price_inr || 299;

  try {
    const receipt = `rcpt_${profile.account_id.replace(/-/g, '').slice(0, 10)}_${Date.now()}`;

    const order = await createRazorpayOrder(amountInInr, receipt, {
      account_id: profile.account_id,
      user_id: user.id,
      plan_id: plan.id,
      plan_name: plan.name,
      billing_cycle,
    });

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: RAZORPAY_KEY_ID,
      plan_name: plan.name,
      billing_cycle,
      user_details: {
        name: profile.full_name || '',
        email: profile.email || user.email || '',
      },
    });
  } catch (err: any) {
    console.error('Razorpay create-order error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to initiate Razorpay order' },
      { status: 500 }
    );
  }
}
