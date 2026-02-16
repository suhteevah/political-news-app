export const metadata = {
  title: "Privacy Policy — The Right Wire",
  description: "Privacy Policy for The Right Wire. We collect minimal data and never sell your information.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-gray-500 text-sm mb-8">Last updated: February 15, 2026</p>

      <div className="space-y-6 text-gray-300 leading-relaxed text-sm">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">1. Information We Collect</h2>
          <p>We collect only what is necessary to provide the Service:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
            <li><strong className="text-gray-300">Account information:</strong> Email address, username, and display name when you create an account</li>
            <li><strong className="text-gray-300">Profile information:</strong> Optional bio and avatar that you choose to provide</li>
            <li><strong className="text-gray-300">Payment information:</strong> Processed and stored by Stripe. We do not store credit card numbers or banking details on our servers</li>
            <li><strong className="text-gray-300">Usage data:</strong> Pages viewed, features used, and engagement metrics to improve the Service</li>
            <li><strong className="text-gray-300">User content:</strong> Posts, comments, and votes you create on the platform</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">2. How We Use Your Information</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li>To provide and maintain the Service</li>
            <li>To process subscription payments via Stripe</li>
            <li>To send transactional emails (account confirmation, password reset, subscription receipts)</li>
            <li>To send optional emails (daily digest, weekly newsletter) if you opt in</li>
            <li>To improve the Service based on usage patterns</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">3. What We Do NOT Do</h2>
          <ul className="list-disc list-inside space-y-1 text-gray-400">
            <li>We do <strong className="text-gray-300">not</strong> sell your personal information to third parties</li>
            <li>We do <strong className="text-gray-300">not</strong> display advertisements or use ad-tracking networks</li>
            <li>We do <strong className="text-gray-300">not</strong> share your data with data brokers</li>
            <li>We do <strong className="text-gray-300">not</strong> use invasive tracking cookies</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">4. Cookies</h2>
          <p>
            We use only essential cookies required for authentication and session management.
            We do not use advertising cookies, tracking pixels, or third-party analytics cookies.
            Our analytics are privacy-friendly and do not use cookies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">5. Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
            <li><strong className="text-gray-300">Supabase:</strong> Authentication and database hosting</li>
            <li><strong className="text-gray-300">Stripe:</strong> Payment processing for subscriptions</li>
            <li><strong className="text-gray-300">Vercel:</strong> Website hosting and deployment</li>
          </ul>
          <p className="mt-2">
            Each service has its own privacy policy. We encourage you to review them.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">6. Data Retention</h2>
          <p>
            We retain your account data for as long as your account is active. If you delete your
            account, we will delete your personal information within 30 days, except where we are
            required to retain it for legal or billing purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-gray-400">
            <li>Access your personal data</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and data</li>
            <li>Opt out of non-essential emails</li>
            <li>Export your data</li>
          </ul>
          <p className="mt-2">
            To exercise these rights, contact us at{" "}
            <a href="mailto:suhteevah@gmail.com" className="text-red-400 hover:text-red-300">
              suhteevah@gmail.com
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">8. Children&apos;s Privacy</h2>
          <p>
            The Service is not intended for children under 13. We do not knowingly collect
            information from children under 13. If we learn we have collected such information,
            we will delete it promptly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">9. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify registered users
            of significant changes via email and update the &quot;Last updated&quot; date above.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">10. Contact</h2>
          <p>
            For privacy-related inquiries, contact us at{" "}
            <a href="mailto:suhteevah@gmail.com" className="text-red-400 hover:text-red-300">
              suhteevah@gmail.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
