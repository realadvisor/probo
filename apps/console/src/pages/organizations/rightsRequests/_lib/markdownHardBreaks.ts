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

// Free-text notes are written one entry per line, but Markdown folds a single
// newline into the paragraph. Add a hard break ("  \n") after a line when the
// next line would otherwise be glued to it: not after blank lines, not inside
// fenced code blocks, and not where the next line starts its own block (list
// item, heading, quote, table row, fence).
const FENCE_RE = /^\s*(```|~~~)/;
const BLOCK_START_RE = /^\s*(?:[-*+]\s|\d+[.)]\s|#{1,6}\s|>|\||```|~~~)/;

export function markdownHardBreaks(text: string): string {
  const lines = text.split(/\r?\n/);
  let inFence = false;
  return lines
    .map((line, index) => {
      if (FENCE_RE.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) {
        return line;
      }
      const next = lines[index + 1];
      if (
        next === undefined
        || line.trim() === ""
        || next.trim() === ""
        || BLOCK_START_RE.test(next)
        || line.endsWith("  ")
        || line.endsWith("\\")
      ) {
        return line;
      }
      return `${line}  `;
    })
    .join("\n");
}
