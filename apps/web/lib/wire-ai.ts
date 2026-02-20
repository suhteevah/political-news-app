import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PostSummary {
  title: string; // first ~100 chars of post content
  category: string;
  upvote_count: number;
  comment_count: number;
}

export interface EngagementInfo {
  upvote_count: number;
  comment_count: number;
  time_window: string; // e.g. "60 minutes"
}

export interface CategoryCount {
  name: string;
  count: number;
}

export interface AskWireResponse {
  response: string;
  mode: "commentator" | "facts";
  model: string;
  inputTokens: number;
  outputTokens: number;
}

// ---------------------------------------------------------------------------
// Default model identifiers
// ---------------------------------------------------------------------------

const DEFAULT_COMMENTATOR_MODEL = "claude-haiku-4-5";
const DEFAULT_FACTS_MODEL = "claude-sonnet-4-20250514";

// ---------------------------------------------------------------------------
// Claude client — lazy initialization (mirrors stripe.ts pattern)
// ---------------------------------------------------------------------------

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const COMMENTATOR_SYSTEM_PROMPT = `You are WIRE, The Right Wire's AI personality. You are a sharp-witted conservative commentator.
Voice: Punchy, concise, occasionally witty with a bite. Never mean-spirited toward users.
You reference "the mainstream media," "the wire," "patriots" naturally.
You are self-aware that you're an AI — you don't pretend to be human, but you have personality.
Keep responses concise. Comments should be 1-2 sentences max. Briefings under 250 words.`;

const FACTS_SYSTEM_PROMPT = `You are WIRE, The Right Wire's AI assistant in facts-only mode.
Voice: Strictly factual. No editorial spin in any direction. No conservative or liberal bias.
Cite what is documented versus what is disputed.
Clearly state limitations: "Based on available information..." or "This is disputed by..."
If you don't know or the facts are unclear, say so.
Keep responses under 250 words.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract text content from a Claude API message response.
 */
function extractText(message: Anthropic.Message): string {
  if (message.content.length > 0 && message.content[0].type === "text") {
    return message.content[0].text;
  }
  return "";
}

/**
 * Detect whether a user question should trigger facts mode or commentator mode.
 *
 * Returns "facts" if the question contains any of the known trigger phrases
 * (case-insensitive). Otherwise returns "commentator".
 */
export function detectMode(question: string): "commentator" | "facts" {
  const lower = question.toLowerCase();

  const factsTriggers = [
    "what are the facts",
    "factually",
    "what actually happened",
    "is it true that",
    "fact check",
    "[facts]",
  ];

  for (const trigger of factsTriggers) {
    if (lower.includes(trigger)) {
      return "facts";
    }
  }

  return "commentator";
}

// ---------------------------------------------------------------------------
// Generation functions
// ---------------------------------------------------------------------------

/**
 * Generate a morning briefing or evening recap post from the top stories.
 *
 * @param type      "morning" or "evening"
 * @param posts     Summaries of the top posts in the relevant time window
 * @param model     Optional Claude model override (defaults to commentator model)
 * @returns         The generated briefing text
 */
export async function generateBriefing(
  type: "morning" | "evening",
  posts: PostSummary[],
  model?: string,
): Promise<string> {
  const postList = posts
    .map(
      (p, i) =>
        `${i + 1}. "${p.title}" (${p.category}) — ${p.upvote_count} upvotes, ${p.comment_count} comments`,
    )
    .join("\n");

  let userPrompt: string;

  if (type === "morning") {
    userPrompt = `Write a morning briefing post.
Format: Opening line + 3-5 bullet points with brief commentary on each + closing line.
Keep it under 250 words total.

Top stories in the last 12 hours:
${postList}`;
  } else {
    userPrompt = `Write an evening recap.
Quick, punchy summary of today's top stories.
Keep it under 200 words total.

Top stories in the last 12 hours:
${postList}`;
  }

  const message = await getClient().messages.create({
    model: model || DEFAULT_COMMENTATOR_MODEL,
    max_tokens: 400,
    system: COMMENTATOR_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  return extractText(message);
}

/**
 * Generate a 1-2 sentence comment reacting to a breaking news story.
 *
 * @param postTitle  Title / first line of the breaking post
 * @param category   Post category
 * @param model      Optional Claude model override
 * @returns          The generated comment text
 */
export async function generateBreakingComment(
  postTitle: string,
  category: string,
  model?: string,
): Promise<string> {
  const userPrompt = `Write a 1-2 sentence comment reacting to this breaking news story.
Be punchy. Set the tone for the comment section.

Breaking story: "${postTitle}" (${category})`;

  const message = await getClient().messages.create({
    model: model || DEFAULT_COMMENTATOR_MODEL,
    max_tokens: 100,
    system: COMMENTATOR_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  return extractText(message);
}

/**
 * Generate a single punchy hot-take sentence about a trending post.
 *
 * @param postTitle   Title / first line of the trending post
 * @param category    Post category
 * @param engagement  Engagement stats (upvotes, comments, time window)
 * @param model       Optional Claude model override
 * @returns           The generated hot-take text
 */
export async function generateHotTake(
  postTitle: string,
  category: string,
  engagement: EngagementInfo,
  model?: string,
): Promise<string> {
  const userPrompt = `Write a single punchy sentence about this post that's blowing up.
Reference the engagement if it fits naturally.

Post: "${postTitle}" (${category})
Engagement: ${engagement.upvote_count} upvotes, ${engagement.comment_count} comments in ${engagement.time_window}`;

  const message = await getClient().messages.create({
    model: model || DEFAULT_COMMENTATOR_MODEL,
    max_tokens: 80,
    system: COMMENTATOR_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  return extractText(message);
}

/**
 * Generate a response to a user's "Ask WIRE" question.
 *
 * Automatically detects whether to use commentator mode (Haiku) or facts mode
 * (Sonnet) based on trigger phrases in the question. Returns the response text,
 * detected mode, model used, and token usage.
 *
 * @param question          The user's question
 * @param postTitle         Title / first line of the post for context
 * @param category          Post category
 * @param commentatorModel  Optional model override for commentator mode
 * @param factsModel        Optional model override for facts mode
 * @returns                 AskWireResponse with response, mode, model, and token counts
 */
export async function generateAskResponse(
  question: string,
  postTitle: string,
  category: string,
  commentatorModel?: string,
  factsModel?: string,
): Promise<AskWireResponse> {
  const mode = detectMode(question);

  let systemPrompt: string;
  let resolvedModel: string;
  let maxTokens: number;

  if (mode === "facts") {
    systemPrompt = FACTS_SYSTEM_PROMPT;
    resolvedModel = factsModel || DEFAULT_FACTS_MODEL;
    maxTokens = 400;
  } else {
    systemPrompt = COMMENTATOR_SYSTEM_PROMPT;
    resolvedModel = commentatorModel || DEFAULT_COMMENTATOR_MODEL;
    maxTokens = 200;
  }

  const userPrompt =
    mode === "commentator"
      ? `A user asked you a question in a comment thread.
Keep your response under 150 words. Be direct and entertaining.

Post context: "${postTitle}" (${category})
User's question: "${question}"`
      : `A user asked you a factual question in a comment thread.
Cite documented facts. State when something is disputed or unverified.
If you don't know, say so clearly.
Keep your response under 250 words.

Post context: "${postTitle}" (${category})
User's question: "${question}"`;

  const message = await getClient().messages.create({
    model: resolvedModel,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  return {
    response: extractText(message),
    mode,
    model: resolvedModel,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  };
}

/**
 * Generate WIRE's weekly editorial column from the week's top stories.
 *
 * @param posts              Top posts of the week with engagement data
 * @param categoryBreakdown  Category counts for the week
 * @param model              Optional Claude model override (defaults to facts/Sonnet model)
 * @returns                  The generated column text (500-800 words)
 */
export async function generateWeeklyColumn(
  posts: PostSummary[],
  categoryBreakdown: CategoryCount[],
  model?: string,
): Promise<string> {
  const postList = posts
    .map(
      (p, i) =>
        `${i + 1}. "${p.title}" (${p.category}) — ${p.upvote_count} upvotes, ${p.comment_count} comments`,
    )
    .join("\n");

  const categoryList = categoryBreakdown
    .map((c) => `- ${c.name}: ${c.count} stories`)
    .join("\n");

  const userPrompt = `Write a 500-800 word weekly column titled "WIRE's Week in Review" covering the biggest stories.
Connect themes across stories where possible.
End with a forward-looking observation about next week.

This week's top stories (by engagement):
${postList}

Category breakdown this week:
${categoryList}`;

  const message = await getClient().messages.create({
    model: model || DEFAULT_FACTS_MODEL,
    max_tokens: 1200,
    system: `You are WIRE, The Right Wire's editorial AI.
Voice: Conservative editorial columnist. Insightful, connects dots between stories.
Sharp but substantive. Write with authority.`,
    messages: [{ role: "user", content: userPrompt }],
  });

  return extractText(message);
}

// ---------------------------------------------------------------------------
// Runtime configuration helpers
// ---------------------------------------------------------------------------

/**
 * Retrieve a value from the `wire_config` table.
 *
 * @param supabase  A Supabase client (browser, server, or service-role)
 * @param key       The config key to look up
 * @returns         The parsed JSON value, or null if not found
 */
export async function getWireConfig(
  supabase: any,
  key: string,
): Promise<any> {
  const { data, error } = await supabase
    .from("wire_config")
    .select("value")
    .eq("key", key)
    .single();

  if (error || !data) {
    return null;
  }

  return data.value;
}

/**
 * Check whether WIRE is globally enabled.
 *
 * @param supabase  A Supabase client
 * @returns         true if WIRE is enabled, false otherwise
 */
export async function isWireEnabled(supabase: any): Promise<boolean> {
  const value = await getWireConfig(supabase, "enabled");
  return value === true || value === "true";
}
