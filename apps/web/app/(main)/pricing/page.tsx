import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/get-user-plan";
import { PricingCards } from "@/components/pricing-cards";

export const metadata = {
  title: "Pricing — The Right Wire",
  description: "Choose your plan. Free forever, or unlock premium features with Wire Pro and Wire Intelligence.",
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const { success, canceled } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const currentPlan = await getUserPlan(user?.id);

  return (
    <div className="max-w-5xl mx-auto">
      {success && (
        <div className="mb-6 p-4 bg-green-900/30 border border-green-700 rounded-lg text-green-300 text-center">
          Welcome to Wire {currentPlan === "intelligence" ? "Intelligence" : "Pro"}! Your subscription is now active.
        </div>
      )}
      {canceled && (
        <div className="mb-6 p-4 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 text-center">
          Checkout canceled. No charges were made.
        </div>
      )}

      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold">Choose Your Plan</h1>
        <p className="mt-3 text-gray-400 text-lg">
          The Right Wire is free forever. Upgrade for premium features built for political news junkies.
        </p>
      </div>

      <PricingCards currentPlan={currentPlan} isLoggedIn={!!user} />

      <div className="mt-16 text-center text-sm text-gray-500">
        <p>All plans include a 7-day money-back guarantee. Cancel anytime.</p>
        <p className="mt-1">
          Questions? <a href="/contact" className="text-red-400 hover:text-red-300">Contact us</a> |{" "}
          <a href="/terms" className="text-red-400 hover:text-red-300">Terms</a> |{" "}
          <a href="/privacy" className="text-red-400 hover:text-red-300">Privacy</a> |{" "}
          <a href="/refunds" className="text-red-400 hover:text-red-300">Refund Policy</a>
        </p>
      </div>
    </div>
  );
}
