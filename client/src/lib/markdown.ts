import { TopicWithCommentsAndStars, Week } from "@shared/schema";
import { formatDateRange } from "./date-utils";

/**
 * Generate markdown output for topics
 */
export function generateMarkdown(week: Week, topics: TopicWithCommentsAndStars[]): string {
  // Group topics by status
  const featured = topics.filter(t => t.status === "featured");
  const others = topics.filter(t => t.status !== "featured");
  
  let markdown = `# 今週のネタ候補 (${formatDateRange(week.startDate, week.endDate)})\n\n`;
  
  // Add featured topics section
  if (featured.length > 0) {
    markdown += `## 採用済み\n\n`;
    
    featured.forEach((topic, index) => {
      markdown += formatTopic(topic, index + 1);
    });
  }
  
  // Add other topics section
  if (others.length > 0) {
    markdown += `## その他のネタ候補\n\n`;
    
    others.forEach((topic, index) => {
      markdown += formatTopic(topic, featured.length + index + 1);
    });
  }
  
  return markdown;
}

/**
 * Format a single topic in markdown
 */
function formatTopic(topic: TopicWithCommentsAndStars, index: number): string {
  let topicMd = `### ${index}. ${topic.title}`;
  
  // Add status badge for non-featured topics
  if (topic.status === "pending") {
    topicMd += ` [未確認]`;
  } else if (topic.status === "rejected") {
    topicMd += ` [非採用]`;
  } else if (topic.status === "approved") {
    topicMd += ` [承認済]`;
  }
  
  topicMd += `\n\n`;
  topicMd += `- URL: ${topic.url}\n`;
  topicMd += `- 投稿者: ${topic.submitter}\n`;
  topicMd += `- スター: ${topic.starsCount}件\n\n`;
  topicMd += `> ${topic.description}\n\n`;
  
  return topicMd;
}
