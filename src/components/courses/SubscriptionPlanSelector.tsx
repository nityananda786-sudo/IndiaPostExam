"use client";

import {
  subscriptionPlans,
  calculatePlanPrice,
  SubscriptionPlanId,
} from "@/config/subscriptionPlans";

type SubscriptionPlanSelectorProps = {
  monthlyFee: number;
  selectedPlan: SubscriptionPlanId;
  onPlanChange: (planId: SubscriptionPlanId) => void;
};

export default function SubscriptionPlanSelector({
  monthlyFee,
  selectedPlan,
  onPlanChange,
}: SubscriptionPlanSelectorProps) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      {subscriptionPlans.map((plan) => {
        const price = calculatePlanPrice(
          monthlyFee,
          plan
        );

        const selected =
          selectedPlan === plan.id;

        return (
          <button
            key={plan.id}
            type="button"
            onClick={() =>
              onPlanChange(plan.id)
            }
            className={`relative rounded-xl border-2 p-4 text-left transition ${
              selected
                ? "border-red-600 bg-red-50 shadow-sm"
                : "border-slate-200 bg-white hover:border-red-300"
            }`}
          >
            {plan.discountPercent > 0 && (
              <span className="absolute right-2 top-2 rounded-full bg-green-100 px-2 py-1 text-[10px] font-extrabold text-green-700">
                Save {plan.discountPercent}%
              </span>
            )}

            <div className="text-sm font-extrabold text-[#12366f]">
              {plan.name}
            </div>

            <div className="mt-2 text-2xl font-extrabold text-slate-900">
              ₹{price}
            </div>

            <div className="mt-1 text-xs text-slate-500">
              {plan.durationMonths === 1
                ? "1 month access"
                : `${plan.durationMonths} months access`}
            </div>

            {selected && (
              <div className="mt-3 text-xs font-extrabold text-red-600">
                ✓ Selected
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}