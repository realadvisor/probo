// Copyright (c) 2026 Probo Inc <hello@probo.com>.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { describe, expect, it } from "vitest";

import { markdownHardBreaks } from "./markdownHardBreaks";

describe("markdownHardBreaks", () => {
  it("adds a hard break between consecutive text lines", () => {
    expect(markdownHardBreaks("INTAKE receipt sent\n**Done 2 Nov** — all steps")).toBe(
      "INTAKE receipt sent  \n**Done 2 Nov** — all steps",
    );
  });

  it("leaves blank-line separated paragraphs and trailing breaks alone", () => {
    expect(markdownHardBreaks("one\n\ntwo")).toBe("one\n\ntwo");
    expect(markdownHardBreaks("one  \ntwo")).toBe("one  \ntwo");
    expect(markdownHardBreaks("one\\\ntwo")).toBe("one\\\ntwo");
    expect(markdownHardBreaks("last")).toBe("last");
  });

  it("does not touch fenced code blocks", () => {
    const code = "```\nline a\nline b\n```\nafter\nmore";
    expect(markdownHardBreaks(code)).toBe("```\nline a\nline b\n```\nafter  \nmore");
  });

  it("does not break before list items, headings, quotes or tables", () => {
    expect(markdownHardBreaks("intro\n- a\n- b\n1. c\n# h\n> q\n| t |")).toBe(
      "intro\n- a\n- b\n1. c\n# h\n> q\n| t |",
    );
  });
});
