export const metadata = {
  title: "Terms of Service — The Right Wire",
  description: "Terms of Service for The Right Wire political news aggregator.",
};

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <p className="text-gray-500 text-sm mb-8">Last updated: February 15, 2026</p>

      <div className="space-y-6 text-gray-300 leading-relaxed text-sm">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">1. Acceptance of Terms</h2>
          <p>
            By accessing or using The Right Wire (&quot;the Service&quot;), operated at the-right-wire.com,
            you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">2. Account Registration</h2>
          <p>
            To access certain features, you must create an account with a valid email address and
            password. You are responsible for maintaining the confidentiality of your account
            credentials and for all activity that occurs under your account. You must be at least
            13 years old to create an account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">3. Subscription &amp; Billing</h2>
          <p>
            The Right Wire offers free and paid subscription plans. Paid plans (Wire Pro, Wire
            Intelligence) are billed on a recurring basis (monthly or annually) through Stripe,
            our payment processor. By subscribing, you authorize us to charge your payment method
            on a recurring basis until you cancel.
          </p>
          <p className="mt-2">
            Prices are listed on our <a href="/pricing" className="text-red-400 hover:text-red-300">pricing page</a> and
            may change with 30 days&apos; notice to existing subscribers. All prices are in USD.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">4. Cancellation &amp; Refunds</h2>
          <p>
            You may cancel your subscription at any time through your account settings or the
            Stripe Customer Portal. Upon cancellation, your access to paid features continues
            through the end of your current billing period. No partial refunds are issued for
            monthly plans. Annual plans are eligible for a full refund within 7 days of purchase.
            See our <a href="/refunds" className="text-red-400 hover:text-red-300">Refund Policy</a> for details.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">5. User Conduct</h2>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
            <li>Post content that is illegal, threatening, harassing, or defamatory</li>
            <li>Impersonate any person or entity</li>
            <li>Attempt to gain unauthorized access to the Service or its systems</li>
            <li>Use automated tools to scrape or access the Service without permission</li>
            <li>Interfere with or disrupt the Service or servers</li>
          </ul>
          <p className="mt-2">
            We reserve the right to suspend or terminate accounts that violate these terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">6. Content</h2>
          <p>
            Aggregated content from third-party sources (X/Twitter, RSS feeds, YouTube) belongs to
            their respective owners. The Right Wire aggregates and displays this content for
            informational purposes. User-generated content (posts, comments) remains the property
            of the user, with a license granted to The Right Wire to display it on the platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">7. Disclaimer of Warranties</h2>
          <p>
            The Service is provided &quot;as is&quot; without warranties of any kind, either express or
            implied. We do not guarantee the accuracy, completeness, or timeliness of any content
            on the platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, The Right Wire and its operators shall not be
            liable for any indirect, incidental, special, consequential, or punitive damages arising
            from your use of the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">9. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of the Service after changes
            constitutes acceptance of the updated terms. We will notify registered users of
            significant changes via email.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">10. Contact</h2>
          <p>
            For questions about these terms, contact us at{" "}
            <a href="mailto:suhteevah@gmail.com" className="text-red-400 hover:text-red-300">
              suhteevah@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
