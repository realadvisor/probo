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

import {
  Badge,
  IconCircleCheck1,
  IconCircleProgress,
  IconCircleQuestionmark,
  IconCircleSlashes,
  IconCircleX,
  IconClock,
  IconRadioUnchecked,
  IconWarning,
} from "@probo/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

import type { PlanStatus, PlanStepStatus } from "../_lib/rightsRequestPlan";

type IconComponent = FC<{ size?: number; className?: string }>;

const STATUS_VARIANT: Record<PlanStatus, "neutral" | "info" | "success" | "danger" | "warning"> = {
  planned: "neutral",
  approved: "info",
  waiting: "info",
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

const OUTCOME_ICON: Record<PlanStatus, IconComponent> = {
  planned: IconRadioUnchecked,
  approved: IconCircleProgress,
  waiting: IconClock,
  done: IconCircleCheck1,
  blocked: IconCircleX,
  manual: IconWarning,
};

// What became of the plan, shown where the Approve button was: once a plan
// is approved the button is gone, and the reviewer should see at a glance
// that it ran (or why it did not) without reading the steps. A plan that is
// still "planned" on a request that already left TODO was approved and has
// not been picked up by the worker yet.
export function PlanOutcome({ status, requestState }: { status: PlanStatus; requestState: string }) {
  const { t } = useTranslation();
  const queued = status === "planned" && requestState !== "TODO";
  const Icon = queued ? OUTCOME_ICON.approved : OUTCOME_ICON[status];
  return (
    <Badge variant={queued ? "info" : STATUS_VARIANT[status]} size="md" className="shrink-0">
      <Icon size={14} className="shrink-0" />
      {t(`rightsRequestPlan.outcome.${queued ? "queued" : status}`)}
    </Badge>
  );
}

const STEP_MARK: Record<PlanStepStatus, { icon: IconComponent; className: string }> = {
  pending: { icon: IconRadioUnchecked, className: "text-txt-tertiary" },
  done: { icon: IconCircleCheck1, className: "text-txt-success" },
  failed: { icon: IconCircleX, className: "text-txt-danger" },
  unknown: { icon: IconCircleQuestionmark, className: "text-txt-warning" },
  skipped: { icon: IconCircleSlashes, className: "text-txt-tertiary" },
};

// A status icon in front of a step's system name, read out as the status
// for screen readers.
export function PlanStepMark({ status }: { status: PlanStepStatus }) {
  const { t } = useTranslation();
  const { icon: Icon, className } = STEP_MARK[status];
  const label = t(`rightsRequestPlan.stepStatus.${status}`);
  return (
    <span role="img" aria-label={label} title={label} className={`mt-0.5 shrink-0 ${className}`}>
      <Icon size={16} />
    </span>
  );
}
