export interface Plan {
  id: string;
  name: string;
  price_inr: number;
  price_monthly_inr?: number;
  price_yearly_inr?: number;
  customer_limit?: number | null;
  contacts_limit?: number | null;
  campaigns_limit?: number | null;
  bot_replies_limit?: number | null;
  bot_flows_limit?: number | null;
  custom_fields_limit?: number | null;
  team_members_limit?: number | null;
  ai_bot_access?: boolean;
  api_webhook_access?: boolean;
  whatsapp_calling_api?: boolean;
  is_trial?: boolean;
  trial_days?: number;
  features: string[];
  is_active?: boolean;
  sort_order?: number;
}

export interface CustomOverrides {
  contacts_limit?: number | null;
  campaigns_limit?: number | null;
  bot_replies_limit?: number | null;
  bot_flows_limit?: number | null;
  custom_fields_limit?: number | null;
  team_members_limit?: number | null;
  ai_bot_access?: boolean;
  api_webhook_access?: boolean;
  whatsapp_calling_api?: boolean;
}

export interface Subscription {
  id: string;
  account_id: string;
  plan_id: string;
  status: 'active' | 'expired' | 'cancelled';
  start_date: string;
  end_date: string;
  notes: string | null;
  billing_cycle?: 'monthly' | 'yearly';
  is_trial?: boolean;
  custom_overrides?: CustomOverrides | null;
  plans: Plan | null;
}

export interface SubscriptionLimitInfo {
  used: number;
  max: number; // -1 means unlimited
  unlimited: boolean;
  allowed: boolean;
  remaining: number;
}

export interface AccountSubscriptionStatus {
  subscription: Subscription | null;
  plan: Plan | null;
  isActive: boolean;
  isTrial: boolean;
  isExpired: boolean;
  daysRemaining: number;
  limits: {
    contacts: SubscriptionLimitInfo;
    campaigns: SubscriptionLimitInfo;
    botFlows: SubscriptionLimitInfo;
    botReplies: SubscriptionLimitInfo;
    customFields: SubscriptionLimitInfo;
    teamMembers: SubscriptionLimitInfo;
    aiChatBot: boolean;
    apiWebhookAccess: boolean;
    whatsappCallingApi: boolean;
  };
}
