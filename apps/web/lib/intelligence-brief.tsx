import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Register a clean sans-serif font
Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCo3FwrK3iLTcviYwYZ90OmPA.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCo3FwrK3iLTcvhywYZ90OmPA.ttf",
      fontWeight: 600,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v18/UcCo3FwrK3iLTcvlywYZ90OmPA.ttf",
      fontWeight: 700,
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Inter",
    fontSize: 10,
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#dc2626",
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: "#dc2626",
  },
  subtitle: {
    fontSize: 10,
    color: "#666",
    marginTop: 2,
  },
  date: {
    fontSize: 9,
    color: "#999",
    textAlign: "right" as const,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#111",
    marginBottom: 8,
    marginTop: 16,
  },
  sectionSubtitle: {
    fontSize: 10,
    color: "#666",
    marginBottom: 12,
  },
  postItem: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e5e5",
  },
  postMeta: {
    fontSize: 8,
    color: "#999",
    marginBottom: 3,
  },
  postContent: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#333",
  },
  postCategory: {
    fontSize: 7,
    color: "#dc2626",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    marginRight: 6,
  },
  breakingBadge: {
    fontSize: 7,
    color: "#ffffff",
    backgroundColor: "#dc2626",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    fontWeight: 700,
    marginRight: 6,
  },
  statsRow: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: "#e5e5e5",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 700,
    color: "#dc2626",
  },
  statLabel: {
    fontSize: 8,
    color: "#666",
    marginTop: 2,
  },
  categoryBreakdown: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 16,
  },
  categoryChip: {
    fontSize: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    color: "#374151",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: "#e5e5e5",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7,
    color: "#999",
  },
  trendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
  },
  trendTopic: {
    fontSize: 9,
    fontWeight: 600,
    color: "#333",
  },
  trendCount: {
    fontSize: 9,
    color: "#dc2626",
    fontWeight: 600,
  },
});

interface BriefPost {
  id: string;
  content: string;
  x_author_name: string;
  x_author_handle: string;
  category: string;
  created_at: string;
  external_url?: string;
  source?: string;
  is_breaking?: boolean;
  upvote_count: number;
  comment_count: number;
}

export interface BriefData {
  date: string;
  topPosts: BriefPost[];
  breakingPosts: BriefPost[];
  stats: {
    totalPosts: number;
    totalSources: number;
    breakingCount: number;
    topCategory: string;
  };
  categoryBreakdown: { category: string; count: number }[];
  trendingTopics: { topic: string; mentions: number }[];
}

export function IntelligenceBriefPDF({ data }: { data: BriefData }) {
  return (
    <Document>
      {/* Page 1: Executive Summary */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Intelligence Brief</Text>
            <Text style={styles.subtitle}>The Right Wire — Daily Analysis</Text>
          </View>
          <View>
            <Text style={styles.date}>{data.date}</Text>
            <Text style={styles.date}>CONFIDENTIAL — Wire Intelligence</Text>
          </View>
        </View>

        {/* Stats */}
        <Text style={styles.sectionTitle}>Executive Summary</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{data.stats.totalPosts}</Text>
            <Text style={styles.statLabel}>Stories Tracked</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{data.stats.totalSources}</Text>
            <Text style={styles.statLabel}>Active Sources</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{data.stats.breakingCount}</Text>
            <Text style={styles.statLabel}>Breaking Alerts</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{data.stats.topCategory}</Text>
            <Text style={styles.statLabel}>Top Category</Text>
          </View>
        </View>

        {/* Category Breakdown */}
        <Text style={styles.sectionTitle}>Category Distribution</Text>
        <View style={styles.categoryBreakdown}>
          {data.categoryBreakdown.map((cat) => (
            <Text key={cat.category} style={styles.categoryChip}>
              {cat.category}: {cat.count}
            </Text>
          ))}
        </View>

        {/* Trending Topics */}
        {data.trendingTopics.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Trending Topics</Text>
            <Text style={styles.sectionSubtitle}>
              Most mentioned themes in the last 24 hours
            </Text>
            {data.trendingTopics.slice(0, 10).map((topic) => (
              <View key={topic.topic} style={styles.trendRow}>
                <Text style={styles.trendTopic}>{topic.topic}</Text>
                <Text style={styles.trendCount}>{topic.mentions} mentions</Text>
              </View>
            ))}
          </>
        )}

        {/* Breaking Stories */}
        {data.breakingPosts.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
              Breaking Stories
            </Text>
            {data.breakingPosts.slice(0, 5).map((post) => (
              <View key={post.id} style={styles.postItem}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={styles.breakingBadge}>BREAKING</Text>
                  <Text style={styles.postMeta}>
                    {post.x_author_name} · {post.category}
                  </Text>
                </View>
                <Text style={styles.postContent}>
                  {post.content.slice(0, 200)}
                  {post.content.length > 200 ? "..." : ""}
                </Text>
              </View>
            ))}
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            The Right Wire Intelligence Brief — {data.date}
          </Text>
          <Text style={styles.footerText}>Page 1</Text>
        </View>
      </Page>

      {/* Page 2: Top Stories Detail */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Top Stories</Text>
            <Text style={styles.subtitle}>
              Highest engagement stories from the last 24 hours
            </Text>
          </View>
          <Text style={styles.date}>{data.date}</Text>
        </View>

        {data.topPosts.slice(0, 15).map((post, i) => (
          <View key={post.id} style={styles.postItem}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 2,
              }}
            >
              <Text style={styles.postCategory}>{post.category}</Text>
              {post.is_breaking && (
                <Text style={styles.breakingBadge}>BREAKING</Text>
              )}
              <Text style={styles.postMeta}>
                {post.x_author_name} (@{post.x_author_handle}) ·{" "}
                {new Date(post.created_at).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {" · "}
                {post.upvote_count} votes · {post.comment_count} comments
              </Text>
            </View>
            <Text style={styles.postContent}>
              {post.content.slice(0, 300)}
              {post.content.length > 300 ? "..." : ""}
            </Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            The Right Wire Intelligence Brief — {data.date}
          </Text>
          <Text style={styles.footerText}>Page 2</Text>
        </View>
      </Page>
    </Document>
  );
}

// Extract trending topics from post content using simple keyword frequency
export function extractTrendingTopics(
  posts: BriefPost[]
): { topic: string; mentions: number }[] {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "through", "during",
    "before", "after", "above", "below", "between", "out", "off", "over",
    "under", "again", "further", "then", "once", "here", "there", "when",
    "where", "why", "how", "all", "each", "every", "both", "few", "more",
    "most", "other", "some", "such", "no", "nor", "not", "only", "own",
    "same", "so", "than", "too", "very", "just", "about", "up", "this",
    "that", "these", "those", "it", "its", "he", "she", "they", "them",
    "his", "her", "their", "we", "you", "i", "my", "our", "your", "and",
    "but", "or", "if", "while", "because", "until", "what", "which",
    "who", "whom", "rt", "amp", "https", "http", "www", "com",
  ]);

  const wordCounts: Record<string, number> = {};

  for (const post of posts) {
    const words = post.content
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

    const seen = new Set<string>();
    for (const word of words) {
      if (!seen.has(word)) {
        seen.add(word);
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    }
  }

  return Object.entries(wordCounts)
    .filter(([, count]) => count >= 3)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([topic, mentions]) => ({
      topic: topic.charAt(0).toUpperCase() + topic.slice(1),
      mentions,
    }));
}
