'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { AccountSubscriptionStatus, Plan, Subscription } from '@/lib/subscription/types';
import { toast } from 'sonner';

interface SubscriptionContextValue {
  subscription: Subscription | null;
  plan: Plan | null;
  plans: Plan[];
  loading: boolean;
  isActive: boolean;
  isTrial: boolean;
  isExpired: boolean;
  daysRemaining: number;
  limits: AccountSubscriptionStatus['limits'] | null;
  refreshSubscription: () => Promise<void>;
  activateTrial: () => Promise<boolean>;
  subscribePlan: (planId: string, billingCycle?: 'monthly' | 'yearly') => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AccountSubscriptionStatus | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    try {
      const res = await fetch('/api/subscription');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.plans) setPlans(json.plans);
      }
    } catch (e) {
      console.error('Failed to load subscription:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const activateTrial = useCallback(async () => {
    const freePlan = plans.find(p => p.name === 'Free Plan' || p.is_trial);
    if (!freePlan) {
      toast.error('Free trial plan not found');
      return false;
    }

    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: freePlan.id,
          is_trial_request: true,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Failed to activate trial');
        return false;
      }

      toast.success(json.message || '7-Day Free Trial activated!');
      await fetchSubscription();
      return true;
    } catch (e) {
      toast.error('Network error activating trial');
      return false;
    }
  }, [plans, fetchSubscription]);

  const subscribePlan = useCallback(async (planId: string, billingCycle: 'monthly' | 'yearly' = 'monthly') => {
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: planId,
          billing_cycle: billingCycle,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Failed to update subscription');
        return false;
      }

      toast.success(json.message || 'Subscribed successfully!');
      await fetchSubscription();
      return true;
    } catch (e) {
      toast.error('Network error during subscription');
      return false;
    }
  }, [fetchSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription: data?.subscription ?? null,
        plan: data?.plan ?? null,
        plans,
        loading,
        isActive: data?.isActive ?? false,
        isTrial: data?.isTrial ?? false,
        isExpired: data?.isExpired ?? false,
        daysRemaining: data?.daysRemaining ?? 0,
        limits: data?.limits ?? null,
        refreshSubscription: fetchSubscription,
        activateTrial,
        subscribePlan,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    return {
      subscription: null,
      plan: null,
      plans: [],
      loading: false,
      isActive: false,
      isTrial: false,
      isExpired: false,
      daysRemaining: 0,
      limits: null,
      refreshSubscription: async () => {},
      activateTrial: async () => false,
      subscribePlan: async () => false,
    };
  }
  return ctx;
}
