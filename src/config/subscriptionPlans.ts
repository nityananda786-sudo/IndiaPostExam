export type SubscriptionPlanId =
  | "monthly"
  | "six_month"
  | "annual";

export type SubscriptionPlan = {
  id: SubscriptionPlanId;
  name: string;
  durationMonths: number;
  discountPercent: number;
};

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "monthly",
    name: "1 Month",
    durationMonths: 1,
    discountPercent: 0,
  },
  {
    id: "six_month",
    name: "6 Months",
    durationMonths: 6,
    discountPercent: 20,
  },
  {
    id: "annual",
    name: "1 Year",
    durationMonths: 12,
    discountPercent: 30,
  },
];

export function calculatePlanPrice(
  monthlyFee: number,
  plan: SubscriptionPlan
): number {
  const basePrice =
    monthlyFee * plan.durationMonths;

  const discountedPrice =
    basePrice *
    (1 - plan.discountPercent / 100);

  return Math.round(discountedPrice);
}