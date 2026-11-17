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

import { tv } from "tailwind-variants/lite";

export const rightsRequestDetailsPage = tv({
  slots: {
    root: "space-y-6",
    header: "flex items-start justify-between gap-4",
    intro: "min-w-0 space-y-1",
    heading: "flex flex-wrap items-center gap-3",
    title: "text-2xl font-semibold text-txt-primary",
    subtitle: "text-sm text-txt-secondary",
    form: "space-y-6",
    grid: "grid grid-cols-1 gap-4 md:grid-cols-2",
    footer: "flex justify-end",
  },
});

// Markdown rendered inside a form: the kit's Markdown sets its own prose
// palette and 16px size, so both are mapped back to the theme tokens and the
// input text size here.
export const markdownProse = tv({
  base: [
    "max-w-none",
    "[&_.prose]:max-w-none [&_.prose]:text-sm [&_.prose]:leading-6",
    "[&_.prose]:[--tw-prose-body:var(--color-txt-primary)]",
    "[&_.prose]:[--tw-prose-headings:var(--color-txt-primary)]",
    "[&_.prose]:[--tw-prose-lead:var(--color-txt-secondary)]",
    "[&_.prose]:[--tw-prose-links:var(--color-txt-primary)]",
    "[&_.prose]:[--tw-prose-bold:var(--color-txt-primary)]",
    "[&_.prose]:[--tw-prose-counters:var(--color-txt-tertiary)]",
    "[&_.prose]:[--tw-prose-bullets:var(--color-txt-tertiary)]",
    "[&_.prose]:[--tw-prose-hr:var(--color-border-low)]",
    "[&_.prose]:[--tw-prose-quotes:var(--color-txt-secondary)]",
    "[&_.prose]:[--tw-prose-quote-borders:var(--color-border-mid)]",
    "[&_.prose]:[--tw-prose-captions:var(--color-txt-tertiary)]",
    "[&_.prose]:[--tw-prose-code:var(--color-txt-primary)]",
    "[&_.prose]:[--tw-prose-pre-code:var(--color-txt-primary)]",
    "[&_.prose]:[--tw-prose-pre-bg:transparent]",
    "[&_.prose]:[--tw-prose-th-borders:var(--color-border-mid)]",
    "[&_.prose]:[--tw-prose-td-borders:var(--color-border-low)]",
  ],
  variants: {
    tone: {
      primary: "",
      secondary: "[&_.prose]:[--tw-prose-body:var(--color-txt-secondary)]",
    },
  },
  defaultVariants: {
    tone: "primary",
  },
});

export const markdownField = tv({
  slots: {
    root: "flex flex-col",
    head: "mb-[6px] flex min-h-8 items-center justify-between gap-2",
    label: "mb-0",
    view: "min-h-10 rounded-[10px] border border-border-low bg-subtle px-3 py-2 text-sm text-txt-primary",
    empty: "text-txt-tertiary",
    error: "mt-1 text-sm text-txt-danger",
  },
});

export const planCard = tv({
  slots: {
    root: "space-y-4 rounded-xl border border-border-low bg-subtle p-4",
    head: "flex items-start justify-between gap-4",
    intro: "min-w-0 flex-1 space-y-1",
    titleRow: "flex flex-wrap items-center gap-2",
    icon: "shrink-0 text-txt-tertiary",
    title: "text-sm font-semibold text-txt-primary",
    summary: "text-sm text-txt-secondary",
    meta: "text-xs text-txt-tertiary",
    steps: "space-y-1.5 text-sm",
    step: "flex items-start gap-2",
    stepText: "min-w-0",
    stepSystem: "font-medium text-txt-primary",
    stepAction: "text-txt-secondary",
    stepDetail: "text-txt-tertiary",
    note: "border-t border-border-low pt-3",
    hint: "text-xs text-txt-tertiary",
    notes: "space-y-1 text-sm",
    notesTitle: "font-medium text-txt-primary",
    notesList: "list-disc space-y-0.5 pl-5 text-txt-secondary",
    feedback: "space-y-2 border-t border-border-low pt-4",
    feedbackActions: "flex flex-wrap items-center justify-end gap-2",
  },
});
