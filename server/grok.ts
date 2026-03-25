import OpenAI from "openai";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";

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

export interface GrokTitleSuggestion {
  title: string;
  reasoning: string;
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

// RSS feeds from major Japanese tech news sites
const RSS_FEEDS = [
  "https://rss.itmedia.co.jp/rss/2.0/news_bursts.xml",
  "https://rss.itmedia.co.jp/rss/2.0/ait.xml",
  "https://pc.watch.impress.co.jp/data/rss/1.0/pcw/feed.rdf",
  "https://av.watch.impress.co.jp/data/rss/1.0/avw/feed.rdf",
  "https://dc.watch.impress.co.jp/data/rss/1.0/dcw/feed.rdf",
  "https://k-tai.watch.impress.co.jp/data/rss/1.0/ktw/feed.rdf",
  "https://internet.watch.impress.co.jp/data/rss/1.0/iw/feed.rdf",
  "https://forest.watch.impress.co.jp/data/rss/1.0/wf/feed.rdf",
  "https://gigazine.net/news/rss_2.0/",
  "https://www.publickey1.jp/atom.xml",
];

interface RssArticle {
  title: string;
  url: string;
  date?: string;
}

// Step 1: Fetch latest articles from RSS feeds (real URLs, real titles)
// Step 2: Grok picks the most relevant ones for the podcast topics
export async function getRecommendedArticles(
  topics: Array<{ title: string; url: string; description?: string | null }>
): Promise<GrokRecommendation[]> {
  if (!isGrokEnabled() || !checkAndIncrementDailyLimit()) return [];

  try {
    // Collect existing topic URLs to exclude
    const existingUrls = new Set(topics.map((t) => t.url));

    // Step 1: Fetch RSS feeds in parallel
    const feedResults = await Promise.allSettled(
      RSS_FEEDS.map((url) => fetchRssFeed(url))
    );

    const allArticles: RssArticle[] = [];
    const seenUrls = new Set<string>();

    for (const result of feedResults) {
      if (result.status !== "fulfilled") continue;
      for (const article of result.value) {
        if (existingUrls.has(article.url) || seenUrls.has(article.url)) continue;
        seenUrls.add(article.url);
        allArticles.push(article);
      }
    }

    console.log(`RSS feeds: fetched ${allArticles.length} articles from ${RSS_FEEDS.length} feeds`);

    if (allArticles.length === 0) return [];

    // Filter to recent articles (last 7 days)
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentArticles = allArticles.filter((a) => {
      if (!a.date) return true; // include if no date
      try {
        return new Date(a.date).getTime() > weekAgo;
      } catch {
        return true;
      }
    });

    const articlesToRank = recentArticles.length > 0 ? recentArticles : allArticles;

    // Limit to ~60 articles to fit in context
    const candidates = articlesToRank.slice(0, 60);

    // Step 2: Ask Grok to pick the best 10
    return await rankArticlesWithGrok(topics, candidates);
  } catch (error) {
    console.error("Grok recommendations error:", error);
    return [];
  }
}

async function fetchRssFeed(feedUrl: string): Promise<RssArticle[]> {
  try {
    const res = await fetch(feedUrl, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NetaspaceBot/1.0)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });

    if (res.status >= 400) return [];

    const xml = await res.text();
    const articles: RssArticle[] = [];

    // Simple XML parsing for RSS 2.0 and RSS 1.0/RDF
    const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
    const entryRegex = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
    const items = [...xml.matchAll(itemRegex), ...xml.matchAll(entryRegex)];

    for (const match of items) {
      const itemXml = match[1];
      const title = extractXmlTag(itemXml, "title");
      const link =
        extractXmlTag(itemXml, "link") ||
        extractXmlAttr(itemXml, "link", "href");
      const date =
        extractXmlTag(itemXml, "pubDate") ||
        extractXmlTag(itemXml, "dc:date") ||
        extractXmlTag(itemXml, "published") ||
        extractXmlTag(itemXml, "updated");

      if (title && link && title.length >= 5) {
        articles.push({ title: cleanXmlText(title), url: link.trim(), date: date || undefined });
      }
    }

    return articles;
  } catch {
    return [];
  }
}

function extractXmlTag(xml: string, tag: string): string | null {
  // Handle CDATA
  const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i");
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function extractXmlAttr(xml: string, tag: string, attr: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function cleanXmlText(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

async function rankArticlesWithGrok(
  topics: Array<{ title: string; url: string; description?: string | null }>,
  candidates: RssArticle[]
): Promise<GrokRecommendation[]> {
  try {
    const ai = getClient();

    const topicList = topics
      .map((t, i) => `${i + 1}. ${t.title}`)
      .join("\n");

    const articleList = candidates
      .map((a, i) => `[${i}] ${a.title}`)
      .join("\n");

    const response = await ai.chat.completions.create({
      model: MODEL(),
      temperature: 0.3,
      max_tokens: 1500,
      messages: [
        {
          role: "system",
          content: `あなたはテクノロジー系ポッドキャスト「backspace.fm」のリスナー向けに記事を選ぶアシスタントです。

以下の候補記事リストから、ネタ帳のトピックと関連性が高く、リスナーが興味を持ちそうな記事を10件選んでください。

選び方の基準:
1. ネタ帳のトピックと関連性が高い記事を優先
2. テクノロジー、ガジェット、AI、科学、宇宙などbackspace.fmのリスナーが好むジャンル
3. なるべく多様なジャンルから選ぶ（同じサイトの記事ばかりにしない）

以下のJSON配列形式のみで回答してください:
[
  {
    "index": 候補記事の番号,
    "reason": "なぜおすすめか（1文、日本語）"
  }
]

必ず10件選んでください。`,
        },
        {
          role: "user",
          content: `■ ネタ帳のトピック:\n${topicList}\n\n■ 候補記事:\n${articleList}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) return [];

    const parsed = parseJsonResponse<Array<{ index: number; reason: string }>>(text);
    if (!Array.isArray(parsed)) return [];

    const results: GrokRecommendation[] = [];
    for (const pick of parsed) {
      if (pick.index >= 0 && pick.index < candidates.length) {
        const article = candidates[pick.index];
        results.push({
          title: article.title,
          url: article.url,
          reason: pick.reason,
        });
      }
    }

    return results.slice(0, 10);
  } catch (error) {
    console.error("Grok ranking error:", error);
    return [];
  }
}

export async function generatePodcastTitles(
  topics: Array<{ title: string; url: string; description?: string | null; status: string; starsCount: number }>
): Promise<GrokTitleSuggestion[] | null> {
  if (!isGrokEnabled() || !checkAndIncrementDailyLimit()) return null;

  try {
    const ai = getClient();

    // Sort: featured first, then by stars descending
    const featured = topics
      .filter((t) => t.status === "featured")
      .sort((a, b) => b.starsCount - a.starsCount);
    const others = topics
      .filter((t) => t.status !== "featured")
      .sort((a, b) => b.starsCount - a.starsCount);

    const sorted = [...featured, ...others].slice(0, 20);

    const topicList = sorted
      .map((t, i) => {
        const badge = t.status === "featured" ? "★採用済み" : `☆${t.starsCount}`;
        return `${i + 1}. [${badge}] ${t.title}`;
      })
      .join("\n");

    const response = await ai.chat.completions.create({
      model: MODEL(),
      temperature: 0.5,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: `あなたはテクノロジー系ポッドキャスト「backspace.fm」のエピソードタイトルを考えるアシスタントです。
以下のトピックリストを基に、魅力的なエピソードタイトルを3つ提案してください。

タイトル作成のルール:
1. 「★採用済み」トピックを最も重視してタイトルに反映する
2. スター数の多い人気トピックも考慮する
3. 簡潔で魅力的、リスナーが聞きたくなるタイトル
4. backspace.fmらしいカジュアルなテイスト
5. 日本語で作成
6. エピソード番号（ep○○○）は含めないでください（自動で付与されます）

以下のJSON配列形式のみで回答してください:
[
  {"title": "タイトル案", "reasoning": "選んだ理由（1文）"}
]

必ず3つ提案してください。`,
        },
        {
          role: "user",
          content: `■ 今週のトピック:\n${topicList}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) return null;

    const parsed = parseJsonResponse<GrokTitleSuggestion[]>(text);
    if (!Array.isArray(parsed)) return null;

    return parsed.slice(0, 3);
  } catch (error) {
    console.error("Grok title generation error:", error);
    return null;
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
