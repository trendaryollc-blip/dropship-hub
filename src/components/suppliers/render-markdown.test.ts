import { describe, it, expect } from "vitest";
import { renderMarkdown as renderSupplierMarkdown } from "./SupplierAITab";
import { renderMarkdown as renderQuickActionMarkdown } from "./QuickActionResult";

const XSS = `<img src=x onerror=alert(1)>`;
const XSS_SCRIPT = `<script>alert("pwned")</script>`;

describe("renderMarkdown XSS hardening (AI output is untrusted)", () => {
  it("SupplierAITab escapes raw HTML", () => {
    const html = renderSupplierMarkdown(`### Title\n${XSS}\n${XSS_SCRIPT}`);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<h3");
    expect(html).toContain("Title");
  });

  it("SupplierAITab keeps markdown structure", () => {
    const html = renderSupplierMarkdown("# H1\n\n## H2\n**bold**\n- item\n• item2");
    expect(html).toContain("<h1");
    expect(html).toContain("<h2");
    expect(html).toContain("<p class=\"font-semibold");
    expect(html).toContain("<li");
    expect(html).toContain("<br/>");
  });

  it("QuickActionResult escapes raw HTML in paragraphs and headings", () => {
    const html = renderQuickActionMarkdown(`## Section\n${XSS}\nplain ${XSS_SCRIPT}`);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("<h2");
  });

  it("QuickActionResult escapes table cells but keeps table markup", () => {
    const html = renderQuickActionMarkdown(
      `| Col | ${XSS} |\n| --- | --- |\n| a | <b>bold?</b> |\n| c | d |`
    );
    expect(html).toContain("<table");
    expect(html).toContain("<th");
    expect(html).toContain("<td");
    expect(html.match(/<table/g)).toHaveLength(1);
    expect(html).not.toContain("<b>bold?</b>");
    expect(html).toContain("&lt;b&gt;bold?&lt;/b&gt;");
    expect(html).not.toContain("<img");
  });

  it("QuickActionResult still renders bold and code after escaping", () => {
    const html = renderQuickActionMarkdown(`**strong** and \`code\``);
    expect(html).toContain("<strong");
    expect(html).toContain("<code");
    expect(html).toContain("strong");
  });
});
