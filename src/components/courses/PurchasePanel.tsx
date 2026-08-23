"use client";

import { useState } from "react";
import SubscriptionPlanSelector from "@/components/courses/SubscriptionPlanSelector";
import BuyCourseButton from "@/components/courses/BuyCourseButton";
import { type SubscriptionPlanId } from "@/config/subscriptionPlans";

type Course = {
  id: string;
  title: string;
  fee: number;
  description: string;
};

type PurchasePanelProps = {
  course: Course;
  buttonText?: string;
  compact?: boolean;
  subscription?: {
    expiresAt?: Date;
  } | null;
};

export default function PurchasePanel({
  course,
  buttonText = "Purchase Course",
  compact = false,
  subscription,
}: PurchasePanelProps) {
  const [selectedPlan, setSelectedPlan] =
    useState<SubscriptionPlanId>("monthly");

  return (
    <div
      className={
        compact
          ? "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          : "mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      }
    >

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-red-600">
            {buttonText}
          </p>

          <h3 className="mt-1 text-xl font-extrabold text-[#12366f]">
            Choose Your Plan
          </h3>
        </div>

        {subscription?.expiresAt && (
          <div className="rounded-xl bg-green-50 px-4 py-2 text-center">
            <p className="text-[11px] font-bold uppercase text-green-700">
              Current Access
            </p>

            <p className="text-sm font-extrabold text-green-800">
              Valid until{" "}
              {subscription.expiresAt.toLocaleDateString("en-IN")}
            </p>
          </div>
        )}

      </div>

      <SubscriptionPlanSelector
        monthlyFee={course.fee}
        selectedPlan={selectedPlan}
        onPlanChange={setSelectedPlan}
      />

      <div className="mt-4">
        <BuyCourseButton
          courseId={course.id}
          courseName={course.title}
          fee={course.fee}
          planId={selectedPlan}
        />
      </div>

    </div>
  );
}
