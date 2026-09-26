import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyRazorpaySignature } from '@/lib/razorpay';

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

  const body = await request.json();
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    plan_id,
    billing_cycle = 'monthly',
  } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan_id) {
    return NextResponse.json(
      { error: 'Missing required payment verification parameters' },
      { status: 400 }
    );
  }

  // 1. Verify HMAC SHA-256 Signature
  const isValid = verifyRazorpaySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  if (!isValid) {
    console.error('Razorpay signature verification failed:', {
      razorpay_order_id,
      razorpay_payment_id,
    });
    return NextResponse.json(
      { error: 'Payment verification failed. Signature mismatch.' },
      { status: 400 }
    );
  }

  // 2. Fetch target plan
  const { data: plan, error: planErr } = await supabase
    .from('plans')
    .select('*')
    .eq('id', plan_id)
    .single();

  if (planErr || !plan) {
    return NextResponse.json({ error: 'Target plan not found' }, { status: 404 });
  }

  // 3. Compute subscription dates
  const now = new Date();
  const endDate = new Date(now);

  if (billing_cycle === 'yearly') {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  const notes = `Razorpay Payment Successful: Payment ID=${razorpay_payment_id}, Order ID=${razorpay_order_id}, Cycle=${billing_cycle}`;

  // 4. Activate subscription in database
  const { data: subData, error: subErr } = await supabase
    .from('subscriptions')
    .upsert(
      {
        account_id: profile.account_id,
        plan_id: plan.id,
        status: 'active',
        is_trial: false,
        billing_cycle: billing_cycle === 'yearly' ? 'yearly' : 'monthly',
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
        notes,
        created_by: user.id,
      },
      { onConflict: 'account_id' }
    )
    .select(
      `
      id,
      account_id,
      plan_id,
      status,
      start_date,
      end_date,
      notes,
      billing_cycle,
      is_trial,
      plans (*)
    `
    )
    .single();

  if (subErr) {
    console.error('Failed to activate subscription after payment:', subErr);
    return NextResponse.json(
      { error: 'Payment verified, but database activation failed: ' + subErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Payment successful! Your ${plan.name} subscription is now active.`,
    subscription: subData,
    payment_id: razorpay_payment_id,
    order_id: razorpay_order_id,
    plan_name: plan.name,
    billing_cycle,
  });
}
