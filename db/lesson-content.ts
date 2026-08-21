import katex from "katex";

const allowedTags = new Set(["p", "br", "strong", "b", "em", "i", "u", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "pre", "code", "a", "hr"]);

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function sanitizeLessonHtml(input: string) {
  const source = input.trim();
  if (!source) return "";
  if (!/<\/?[a-z][\s\S]*>/i.test(source)) {
    return source.split(/\n\s*\n/).map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`).join("");
  }
  return source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|form)[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\/?\s*([a-z0-9]+)([^>]*)>/gi, (whole, rawTag: string, rawAttributes: string) => {
      const tag = rawTag.toLowerCase();
      if (!allowedTags.has(tag)) return "";
      const closing = /^<\s*\//.test(whole);
      if (closing) return tag === "br" || tag === "hr" ? "" : `</${tag}>`;
      if (tag === "br" || tag === "hr") return `<${tag}>`;
      if (tag === "a") {
        const match = rawAttributes.match(/href\s*=\s*["']([^"']+)["']/i);
        const href = match?.[1] ?? "";
        return /^https?:\/\//i.test(href) ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">` : "<a>";
      }
      return `<${tag}>`;
    });
}

export function renderLessonHtml(input: string) {
  const safe = sanitizeLessonHtml(input);
  return safe.replace(/\$([^$]+)\$/g, (whole, expression: string) => {
    try {
      return katex.renderToString(expression, { throwOnError: false, output: "html" });
    } catch {
      return escapeHtml(whole);
    }
  });
}
