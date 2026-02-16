import Link from "next/link";

export const metadata = {
  title: "Contact — The Right Wire",
  description: "Get in touch with The Right Wire team for support, feedback, or inquiries.",
};

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Contact Us</h1>

      <div className="space-y-6 text-gray-300 leading-relaxed">
        <p>
          We&apos;d love to hear from you. Whether you have a question about The Right Wire,
          need help with your account, or want to share feedback — reach out anytime.
        </p>

        <div className="border border-gray-800 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Email</h2>
            <a
              href="mailto:suhteevah@gmail.com"
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              suhteevah@gmail.com
            </a>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Response Time</h2>
            <p className="text-gray-400 text-sm">
              We typically respond within 24-48 hours. Wire Pro and Wire Intelligence subscribers
              receive priority support.
            </p>
          </div>
        </div>

        <div className="border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Common Topics</h2>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>
              <strong className="text-gray-300">Billing &amp; Subscriptions:</strong>{" "}
              Manage your subscription through your{" "}
              <Link href="/profile" className="text-red-400 hover:text-red-300">profile page</Link>,
              or email us for help.
            </li>
            <li>
              <strong className="text-gray-300">Refunds:</strong>{" "}
              See our <Link href="/refunds" className="text-red-400 hover:text-red-300">refund policy</Link>.
            </li>
            <li>
              <strong className="text-gray-300">Bug Reports:</strong>{" "}
              Email us with a description of the issue, what you expected, and what happened instead.
            </li>
            <li>
              <strong className="text-gray-300">Feature Requests:</strong>{" "}
              We love hearing ideas. Email us or post in the{" "}
              <Link href="/forums" className="text-red-400 hover:text-red-300">forums</Link>.
            </li>
            <li>
              <strong className="text-gray-300">Source Suggestions:</strong>{" "}
              Want us to add a new X account or RSS source? Let us know.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
