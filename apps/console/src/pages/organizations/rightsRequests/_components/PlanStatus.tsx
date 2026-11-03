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

import { Badge } from "@probo/ui";
import { useTranslation } from "react-i18next";

import type { PlanStatus, PlanStepStatus } from "../_lib/rightsRequestPlan";

const STATUS_VARIANT: Record<PlanStatus, "neutral" | "info" | "success" | "danger" | "warning"> = {
  planned: "neutral",
  approved: "info",
  done: "success",
  blocked: "danger",
  manual: "warning",
};

export function PlanStatusBadge({ status, className }: { status: PlanStatus; className?: string }) {
  const { t } = useTranslation();
  return (
    <Badge variant={STATUS_VARIANT[status]} className={className}>
      {t(`rightsRequestPlan.status.${status}`)}
    </Badge>
  );
}

const STEP_MARK: Record<PlanStepStatus, { glyph: string; className: string }> = {
  pending: { glyph: "○", className: "text-txt-tertiary" },
  done: { glyph: "✓", className: "text-txt-success" },
  failed: { glyph: "✕", className: "text-txt-danger" },
  unknown: { glyph: "?", className: "text-txt-warning" },
  skipped: { glyph: "–", className: "text-txt-tertiary" },
};

// A fixed-width glyph in front of a step's system name, read out as the
// status for screen readers.
export function PlanStepMark({ status }: { status: PlanStepStatus }) {
  const { t } = useTranslation();
  const mark = STEP_MARK[status];
  return (
    <span
      role="img"
      aria-label={t(`rightsRequestPlan.stepStatus.${status}`)}
      title={t(`rightsRequestPlan.stepStatus.${status}`)}
      className={`inline-block w-4 shrink-0 text-center font-mono ${mark.className}`}
    >
      {mark.glyph}
    </span>
  );
}
