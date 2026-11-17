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

import { dateFormat } from "@probo/i18n";
import {
  Badge,
  Button,
  IconCircleCheck1,
  IconRobot,
  IconSend,
  IconWarning,
  Label,
  Markdown,
  Textarea,
} from "@probo/ui";
import { useTranslation } from "react-i18next";

import { consoleMarkdownImageOrigins } from "#/lib/markdownImageOrigins";

import type { Plan } from "../_lib/rightsRequestPlan";
import { markdownProse, planCard } from "../variants";

import { PlanOutcome, PlanStepMark } from "./PlanStatus";

interface PlanCardProps {
  plan: Plan;
  requestState: string;
  // What the reviewer told the worker so far, oldest first.
  notes: string[];
  canApprove: boolean;
  isApproving: boolean;
  // Shown under the plan while the form has unsaved edits: Approve saves
  // only the state.
  showApproveHint: boolean;
  onApprove: () => void;
  canGiveFeedback: boolean;
  feedback: string;
  onFeedbackChange: (value: string) => void;
  isSendingFeedback: boolean;
  onSendFeedback: () => void;
}

// The plan an external worker proposed for the request, with its outcome,
// its steps and the conversation between the reviewer and the worker.
export function PlanCard({
  plan,
  requestState,
  notes,
  canApprove,
  isApproving,
  showApproveHint,
  onApprove,
  canGiveFeedback,
  feedback,
  onFeedbackChange,
  isSendingFeedback,
  onSendFeedback,
}: PlanCardProps) {
  const { i18n, t } = useTranslation();
  const {
    root,
    head,
    intro,
    titleRow,
    icon,
    title,
    summary,
    meta,
    steps,
    step,
    stepText,
    stepSystem,
    stepAction,
    stepDetail,
    note,
    hint,
    notes: notesClass,
    notesTitle,
    notesList,
    feedback: feedbackClass,
    feedbackActions,
  } = planCard();

  const metaParts = [
    (plan.approvedBy || plan.approvedAt)
    && t("rightsRequestDetailsPage.plan.approvedBy", {
      name: plan.approvedBy ?? t("rightsRequestDetailsPage.plan.unknownApprover"),
      date: plan.approvedAt ? dateFormat(i18n.language, plan.approvedAt) : "",
    }),
    plan.completedAt
    && t("rightsRequestDetailsPage.plan.completedAt", {
      date: dateFormat(i18n.language, plan.completedAt),
    }),
  ].filter((part): part is string => typeof part === "string" && part !== "");

  return (
    <section className={root()}>
      <div className={head()}>
        <div className={intro()}>
          <div className={titleRow()}>
            <IconRobot size={16} className={icon()} />
            <span className={title()}>{t("rightsRequestDetailsPage.plan.title")}</span>
            {plan.needsHuman && (
              <Badge variant="warning">
                <IconWarning size={12} />
                {t("rightsRequestDetailsPage.plan.needsHuman")}
              </Badge>
            )}
          </div>
          <p className={summary()}>{plan.summary}</p>
          {metaParts.length > 0 && <p className={meta()}>{metaParts.join(" · ")}</p>}
        </div>
        {canApprove
          ? (
              <Button
                type="button"
                variant="primary"
                icon={IconCircleCheck1}
                disabled={isApproving}
                onClick={onApprove}
              >
                {isApproving
                  ? t("rightsRequestDetailsPage.plan.approving")
                  : t("rightsRequestDetailsPage.plan.approve")}
              </Button>
            )
          : (
              <PlanOutcome status={plan.status} requestState={requestState} />
            )}
      </div>

      {plan.steps.length > 0 && (
        <ul className={steps()}>
          {plan.steps.map((planStep, index) => (
            <li key={index} className={step()}>
              <PlanStepMark status={planStep.status} />
              <span className={stepText()}>
                <span className={stepSystem()}>{planStep.system}</span>
                {" "}
                <span className={stepAction()}>{planStep.action}</span>
                {planStep.detail && (
                  <span className={stepDetail()}>
                    {" · "}
                    {planStep.detail}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {plan.note && (
        <div className={note()}>
          <div className={markdownProse({ tone: "secondary" })}>
            <Markdown
              content={plan.note}
              allowedImageOrigins={consoleMarkdownImageOrigins()}
            />
          </div>
        </div>
      )}

      {canApprove && showApproveHint && (
        <p className={hint()}>{t("rightsRequestDetailsPage.plan.approveHint")}</p>
      )}

      {notes.length > 0 && (
        <div className={notesClass()}>
          <p className={notesTitle()}>{t("rightsRequestDetailsPage.plan.feedbackGiven")}</p>
          <ul className={notesList()}>
            {notes.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        </div>
      )}

      {canGiveFeedback && (
        <div className={feedbackClass()}>
          <Label>{t("rightsRequestDetailsPage.plan.feedbackLabel")}</Label>
          <Textarea
            value={feedback}
            onChange={e => onFeedbackChange(e.target.value)}
            placeholder={t("rightsRequestDetailsPage.plan.feedbackPlaceholder")}
            rows={2}
          />
          <div className={feedbackActions()}>
            <Button
              type="button"
              variant="tertiary"
              disabled={isSendingFeedback}
              onClick={() => onFeedbackChange(t("rightsRequestDetailsPage.plan.handOverText"))}
            >
              {t("rightsRequestDetailsPage.plan.handOver")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              icon={IconSend}
              disabled={isSendingFeedback || feedback.trim() === ""}
              onClick={onSendFeedback}
            >
              {isSendingFeedback
                ? t("rightsRequestDetailsPage.plan.feedbackSending")
                : t("rightsRequestDetailsPage.plan.feedbackSend")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
