import OpenAI from "openai";
import fetch from "node-fetch";

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

    const today = new Date().toISOString().split("T")[0];

    const response = await ai.chat.completions.create({
      model: MODEL(),
      temperature: 0.5,
      max_tokens: 1200,
      messages: [
        {
          role: "system",
          content: `あなたはテクノロジー系ポッドキャスト「backspace.fm」のリスナー向けに関連記事を推薦するアシスタントです。
与えられたネタ帳のトピック一覧を分析し、リスナーが興味を持ちそうな関連記事を8〜10件推薦してください。

今日の日付: ${today}

重要な優先順位:
1. 直近1週間以内に公開された旬なニュース記事を最優先してください
2. ネタ帳のトピックと関連性が高い記事を選んでください
3. ネタ帳にまだ載っていない、話題になっている最新ニュースも含めてください

以下のJSON配列形式のみで回答してください。マークダウンや説明文は不要です:
[
  {
    "title": "記事タイトル",
    "url": "記事URL",
    "reason": "なぜおすすめか（1文、日本語）"
  }
]

注意:
- 確実に実在し、現在アクセス可能な記事のURLのみを推薦してください
- 大手メディアサイト（Impress Watch, ITmedia, CNET Japan, Engadget日本版, GIGAZINE, TechCrunch Japan, PC Watch等）の記事を優先してください
- 日本語の記事を優先してください
- トピック一覧に既にある記事のURLは絶対に除外してください
- 多めに候補を出してください（後でリンク切れを除外します）`,
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
    if (!Array.isArray(parsed)) return [];

    // Verify links and filter out broken ones
    const verified = await verifyLinks(parsed);
    return verified.slice(0, 5);
  } catch (error) {
    console.error("Grok recommendations error:", error);
    return [];
  }
}

async function verifyLinks(
  articles: GrokRecommendation[]
): Promise<GrokRecommendation[]> {
  const results = await Promise.allSettled(
    articles.map(async (article) => {
      try {
        const res = await fetch(article.url, {
          method: "HEAD",
          signal: AbortSignal.timeout(5000),
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          },
          redirect: "follow",
        });
        // Accept 2xx and 3xx as valid
        if (res.status < 400) return article;
        // Some sites block HEAD, try GET
        const getRes = await fetch(article.url, {
          method: "GET",
          signal: AbortSignal.timeout(5000),
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          },
          redirect: "follow",
        });
        if (getRes.status < 400) return article;
        console.log(`Link check failed (${getRes.status}): ${article.url}`);
        return null;
      } catch (err) {
        console.log(`Link check error: ${article.url}`, err);
        return null;
      }
    })
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<GrokRecommendation | null> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value)
    .filter((v): v is GrokRecommendation => v !== null);
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
