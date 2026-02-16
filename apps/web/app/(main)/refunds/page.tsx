export const metadata = {
  title: "Refund Policy — The Right Wire",
  description: "Refund and cancellation policy for The Right Wire subscriptions.",
};

export default function RefundsPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Refund Policy</h1>
      <p className="text-gray-500 text-sm mb-8">Last updated: February 15, 2026</p>

      <div className="space-y-6 text-gray-300 leading-relaxed text-sm">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Cancellation</h2>
          <p>
            You may cancel your Wire Pro or Wire Intelligence subscription at any time through
            your account profile or the Stripe Customer Portal. No reason is required and there
            are no cancellation fees.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">What Happens When You Cancel</h2>
          <p>
            When you cancel, your subscription will remain active until the end of your current
            billing period. You will continue to have access to all paid features during this time.
            After the billing period ends, your account will revert to the free tier.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Monthly Plans</h2>
          <p>
            Monthly subscriptions are non-refundable. When you cancel a monthly plan, you retain
            access through the end of the current month. No partial refunds are issued.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Annual Plans</h2>
          <p>
            Annual subscriptions are eligible for a full refund within 7 days of purchase. After
            7 days, you may still cancel, but your access will continue through the end of the
            annual billing period with no refund.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">How to Request a Refund</h2>
          <p>
            To request a refund for an annual plan within the 7-day window, contact us at{" "}
            <a href="mailto:suhteevah@gmail.com" className="text-red-400 hover:text-red-300">
              suhteevah@gmail.com
            </a>{" "}
            with your account email and the reason for your refund. Refunds are processed within
            5-10 business days back to your original payment method.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Billing Issues</h2>
          <p>
            If you believe you were charged in error or see an unexpected charge, please contact us
            immediately. We will investigate and resolve billing issues promptly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">Contact</h2>
          <p>
            For billing or refund questions, email{" "}
            <a href="mailto:suhteevah@gmail.com" className="text-red-400 hover:text-red-300">
              suhteevah@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
