export type RewardCategory = 'personal_leisure' | 'household' | 'experience';

export interface Reward {
  id: string;
  title: string;
  description?: string;
  category: RewardCategory;
  base_cost: number;
  /** Renewal: Indicates if the item is eligible for the 25% Recovery Window discount */
  is_discountable: boolean;
  is_active: boolean;
}

export interface ActiveRecoveryWindow {
  activated_at: string; // ISO Timestamp
  expires_at: string;   // ISO Timestamp
  discount_rate: number; // e.g., 0.25 (25%)[cite: 3]
}

export interface RewardRedemption {
  id: string;
  user_id: string;
  reward_id: string;
  base_cost: number;
  discount_applied: number; // Amount saved (0 if no window active)
  final_cost_paid: number;
  redeemed_at: string; // ISO Timestamp
}
