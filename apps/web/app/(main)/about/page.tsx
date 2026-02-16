import Link from "next/link";

export const metadata = {
  title: "About — The Right Wire",
  description: "The Right Wire is a conservative news aggregator that curates political content from 32+ trusted sources into one clean feed.",
};

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">About The Right Wire</h1>

      <div className="space-y-6 text-gray-300 leading-relaxed">
        <p>
          The Right Wire is a political news aggregator built for people who want the signal without
          the noise. We curate content from 32+ trusted conservative voices, commentators, and news
          sources into a single, clean feed — updated continuously throughout the day.
        </p>

        <h2 className="text-xl font-semibold text-white mt-8">What We Do</h2>
        <p>
          Our platform automatically aggregates posts from curated X/Twitter accounts, RSS feeds,
          and YouTube channels covering politics, policy, economy, culture, and media. Every post
          is categorized and sortable, so you can find exactly what matters to you.
        </p>

        <h2 className="text-xl font-semibold text-white mt-8">Community</h2>
        <p>
          Beyond the news feed, The Right Wire is a community. Share your own takes, discuss
          in topic-based forums, comment on stories, and vote on the content that matters most.
          We believe political discourse thrives when good people have a platform to engage.
        </p>

        <h2 className="text-xl font-semibold text-white mt-8">No Ads, Ever</h2>
        <p>
          We made a deliberate choice: no advertisements, no sponsored content, no data selling.
          The Right Wire is supported entirely by our subscribers through{" "}
          <Link href="/pricing" className="text-red-400 hover:text-red-300">
            Wire Pro and Wire Intelligence
          </Link>{" "}
          plans. This keeps the experience clean and our incentives aligned with yours.
        </p>

        <h2 className="text-xl font-semibold text-white mt-8">Who We Are</h2>
        <p>
          The Right Wire was built by Americans who were tired of algorithmically manipulated
          feeds and biased curation. We wanted a simple, fast, no-nonsense way to stay informed.
          So we built it.
        </p>

        <div className="mt-10 pt-6 border-t border-gray-800 text-sm text-gray-500">
          <p>
            Have questions or feedback?{" "}
            <Link href="/contact" className="text-red-400 hover:text-red-300">
              Get in touch
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
