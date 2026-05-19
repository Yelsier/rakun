import { RobotsRule } from "../../../internal-content-types";
import { getMongoService } from "../../../orm";
import type { RobotsOutput } from "../../../schemas/web/robots";

type RobotsRuleRecord = {
  name?: string;
  enabled?: boolean;
  directive?: "allow" | "disallow" | "crawlDelay" | "sitemap" | "host" | "comment";
  userAgent?: string;
  path?: string;
  value?: string;
  crawlDelay?: number;
  order?: number;
};

const normalizeUserAgent = (value?: string) => {
  const userAgent = value?.trim();
  return userAgent && userAgent.length > 0 ? userAgent : "*";
};

const normalizePath = (value?: string) => {
  const path = value?.trim();
  return path && path.length > 0 ? path : "/";
};

const renderAgentGroup = (userAgent: string, rules: RobotsRuleRecord[]) => {
  const lines = [`User-agent: ${userAgent}`];

  for (const rule of rules) {
    if (rule.directive === "allow") {
      lines.push(`Allow: ${normalizePath(rule.path)}`);
    }
    if (rule.directive === "disallow") {
      lines.push(`Disallow: ${normalizePath(rule.path)}`);
    }
    if (
      rule.directive === "crawlDelay" &&
      typeof rule.crawlDelay === "number"
    ) {
      lines.push(`Crawl-delay: ${rule.crawlDelay}`);
    }
  }

  return lines.join("\n");
};

export const getRobots = async (): Promise<RobotsOutput> => {
  const db = await getMongoService();
  const { items } = await db.list(RobotsRule, {
    filter: { enabled: true },
    options: {
      limit: "all",
      fields: [
        "name",
        "enabled",
        "directive",
        "userAgent",
        "path",
        "value",
        "crawlDelay",
        "order",
      ],
    },
  });
  const rules = (items as RobotsRuleRecord[]).sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
  const agentRules = rules.filter((rule) =>
    ["allow", "disallow", "crawlDelay"].includes(rule.directive ?? ""),
  );
  const byUserAgent = new Map<string, RobotsRuleRecord[]>();

  for (const rule of agentRules) {
    const userAgent = normalizeUserAgent(rule.userAgent);
    byUserAgent.set(userAgent, [...(byUserAgent.get(userAgent) ?? []), rule]);
  }

  const sections = Array.from(byUserAgent.entries()).map(([userAgent, group]) =>
    renderAgentGroup(userAgent, group),
  );
  const globalLines = rules.flatMap((rule) => {
    if (rule.directive === "sitemap" && rule.value?.trim()) {
      return [`Sitemap: ${rule.value.trim()}`];
    }
    if (rule.directive === "host" && rule.value?.trim()) {
      return [`Host: ${rule.value.trim()}`];
    }
    if (rule.directive === "comment" && rule.value?.trim()) {
      return [`# ${rule.value.trim()}`];
    }
    return [];
  });

  const content = [...sections, ...globalLines].filter(Boolean).join("\n\n");

  return {
    content: content.length > 0 ? `${content}\n` : "User-agent: *\nAllow: /\n",
  };
};
