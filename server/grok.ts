import OpenAI from "openai";

// Types
export interface GrokXSummary {
  sentiment: "positive" | "negative" | "mixed" | "neutral";
  summary: string;
  keyOpinions: string[];
  tweetCount?: string;
}

export interface GrokRecommendation {
  title: string;
  url: string;
  reason: string;
}

// Client singleton
let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: "https://api.x.ai/v1",
    });
  }
  return client;
}

export function isGrokEnabled(): boolean {
  return !!process.env.XAI_API_KEY;
}

const MODEL = () => process.env.GROK_MODEL || "grok-4.20-beta-0309-non-reasoning";

// Daily API call counter
let dailyCallCount = 0;
let dailyResetDate = new Date().toDateString();

function checkAndIncrementDailyLimit(): boolean {
  const today = new Date().toDateString();
  if (today !== dailyResetDate) {
    dailyCallCount = 0;
    dailyResetDate = today;
  }
  const limit = parseInt(process.env.GROK_DAILY_LIMIT || "100", 10);
  if (dailyCallCount >= limit) return false;
  dailyCallCount++;
  return true;
}

export async function summarizeXReactions(
  title: string,
  url: string
): Promise<GrokXSummary | null> {
  if (!isGrokEnabled() || !checkAndIncrementDailyLimit()) return null;

  try {
    const ai = getClient();
    const response = await ai.chat.completions.create({
      model: MODEL(),
      temperature: 0.3,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: `あなたはX(Twitter)上の反応を分析するアシスタントです。
与えられた記事タイトルとURLについて、X上でどのような反応・議論があるかを分析してください。

以下のJSON形式のみで回答してください。マークダウンや説明文は不要です:
{
  "sentiment": "positive" | "negative" | "mixed" | "neutral",
  "summary": "2-3文の日本語要約",
  "keyOpinions": ["注目意見1", "注目意見2", "注目意見3"],
  "tweetCount": "多い" | "普通" | "少ない"
}

X上で議論が見つからない場合は:
{
  "sentiment": "neutral",
  "summary": "この記事についてX上での目立った議論は見つかりませんでした。",
  "keyOpinions": [],
  "tweetCount": "少ない"
}`,
        },
        {
          role: "user",
          content: `記事タイトル: ${title}\nURL: ${url}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) return null;

    return parseJsonResponse<GrokXSummary>(text);
  } catch (error) {
    console.error("Grok X summary error:", error);
    return null;
  }
}

export async function getRecommendedArticles(
  topics: Array<{ title: string; url: string; description?: string | null }>
): Promise<GrokRecommendation[]> {
  if (!isGrokEnabled() || !checkAndIncrementDailyLimit()) return [];

  try {
    const ai = getClient();
    const topicList = topics
      .map((t, i) => `${i + 1}. ${t.title}${t.description ? ` - ${t.description}` : ""}`)
      .join("\n");

    const response = await ai.chat.completions.create({
      model: MODEL(),
      temperature: 0.5,
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content: `あなたはテクノロジー系ポッドキャストのリスナー向けに関連記事を推薦するアシスタントです。
与えられたトピック一覧を分析し、リスナーが興味を持ちそうな関連記事を3〜5件推薦してください。

以下のJSON配列形式のみで回答してください。マークダウンや説明文は不要です:
[
  {
    "title": "記事タイトル",
    "url": "記事URL",
    "reason": "なぜおすすめか（1文、日本語）"
  }
]

注意:
- 実在する記事のURLのみを推薦してください
- 日本語の記事を優先してください
- トピック一覧に既にある記事は除外してください`,
        },
        {
          role: "user",
          content: `今週のトピック一覧:\n${topicList}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) return [];

    const parsed = parseJsonResponse<GrokRecommendation[]>(text);
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch (error) {
    console.error("Grok recommendations error:", error);
    return [];
  }
}

function parseJsonResponse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    // Try to extract JSON from markdown code blocks
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1].trim()) as T;
      } catch {
        return null;
      }
    }
    // Try to find JSON object/array in the text
    const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
