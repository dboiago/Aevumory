export type RewardCategory = 'personal_leisure' | 'household' | 'experience';

export interface Reward {
  id: string;
  title: string;
  description?: string;
  category: RewardCategory;
  base_cost: number; // Integer credits
  is_discountable: boolean; // Explicitly false for 'household'
  is_active: boolean;
}

export interface ActiveRecoveryWindow {
  recovery_window_id: string;
  activated_at: string; // ISO Timestamp
  expires_at: string;   // ISO Timestamp
  discount_rate_applied: number; // e.g., 0.25[cite: 3]
}

export interface RewardRedemption {
  id: string;
  user_id: string;
  reward_id: string;
  base_cost: number;
  final_cost_paid: number; // Integer floor result
  redeemed_at: string; // ISO Timestamp
}
