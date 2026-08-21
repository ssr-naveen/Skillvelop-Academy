"use client";

import katex from "katex";

export default function MathText({ text, className = "" }: { text: string; className?: string }) {
  const parts = text.split(/(\$[^$]+\$)/g).filter(Boolean);
  return <span className={className}>{parts.map((part, index) => {
    if (part.startsWith("$") && part.endsWith("$")) {
      const expression = part.slice(1, -1);
      try {
        return <span className="math-expression" key={index} dangerouslySetInnerHTML={{ __html: katex.renderToString(expression, { throwOnError: false, output: "html" }) }} />;
      } catch {
        return <span key={index}>{part}</span>;
      }
    }
    return <span key={index}>{part}</span>;
  })}</span>;
}
