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

// An external worker proposes how to handle a rights request by writing one
// `PLAN {json}` line into the free-text actionTaken field. The console only
// parses and renders it; the other lines (intake receipts, DONE notes) are
// left to the textarea.

// "waiting": the approved step asked the person something, the worker waits
// for their answer and will then propose the next step.
export const PLAN_STATUSES = ["planned", "approved", "waiting", "done", "blocked", "manual"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const PLAN_STEP_STATUSES = ["pending", "done", "failed", "unknown", "skipped"] as const;
export type PlanStepStatus = (typeof PLAN_STEP_STATUSES)[number];

export type PlanStep = {
  system: string;
  action: string;
  status: PlanStepStatus;
  detail: string | null;
};

export type Plan = {
  version: number;
  summary: string;
  steps: PlanStep[];
  needsHuman: boolean;
  note: string | null;
  // Lifecycle written back by the worker; lines without it are "planned".
  status: PlanStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  completedAt: string | null;
};

// Statuses the worker has already taken past the approval step: nothing left
// for a reviewer to approve.
const CLOSED_PLAN_STATUSES: readonly PlanStatus[] = ["waiting", "done", "blocked", "manual"];

const PLAN_PREFIX = "PLAN ";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function parseStep(value: unknown): PlanStep | null {
  if (!isRecord(value)) {
    return null;
  }
  const { system, action } = value;
  if (typeof system !== "string" || typeof action !== "string") {
    return null;
  }
  return {
    system,
    action,
    status: oneOf(value.status, PLAN_STEP_STATUSES, "pending"),
    detail: optionalString(value.detail),
  };
}

// Returns the plan carried by actionTaken, or null when there is none or the
// line is not a well-formed plan. Only the first PLAN line counts.
export function parsePlan(actionTaken: string | null | undefined): Plan | null {
  if (!actionTaken) {
    return null;
  }

  const line = actionTaken
    .split(/\r?\n/)
    .map(l => l.trim())
    .find(l => l.startsWith(PLAN_PREFIX));
  if (!line) {
    return null;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(line.slice(PLAN_PREFIX.length));
  } catch {
    return null;
  }

  if (!isRecord(raw) || typeof raw.summary !== "string") {
    return null;
  }

  const steps = Array.isArray(raw.steps)
    ? raw.steps.map(parseStep).filter((step): step is PlanStep => step !== null)
    : [];

  return {
    version: typeof raw.version === "number" ? raw.version : 1,
    summary: raw.summary,
    steps,
    needsHuman: raw.needsHuman === true,
    note: optionalString(raw.note),
    status: oneOf(raw.status, PLAN_STATUSES, "planned"),
    approvedBy: optionalString(raw.approvedBy),
    approvedAt: optionalString(raw.approvedAt),
    completedAt: optionalString(raw.completedAt),
  };
}

// A request can be approved from a plan without anyone reading further when
// it is still TODO, the worker did not flag it for a human and the plan is
// not already done, blocked or handed over to manual handling.
export function canApprovePlan(
  requestState: string,
  plan: Plan | null,
): plan is Plan {
  return (
    requestState === "TODO"
    && plan !== null
    && !plan.needsHuman
    && !CLOSED_PLAN_STATUSES.includes(plan.status)
  );
}

// A reviewer talks to the worker with `NOTE: …` lines in actionTaken: the
// worker reads them and proposes again. The console writes and shows them, so
// nobody types the marker.
const NOTE_PATTERN = /^\s*note\s*:\s*/i;

function isMachineLine(line: string): boolean {
  return line.trim().startsWith(PLAN_PREFIX) || NOTE_PATTERN.test(line);
}

// The actionTaken text without its PLAN and NOTE lines, for rendering next to
// the plan card: the card already shows both, the rest is the history of what
// was done (Markdown).
export function stripPlanLines(actionTaken: string | null | undefined): string {
  if (!actionTaken) {
    return "";
  }
  return actionTaken
    .split(/\r?\n/)
    .filter(line => !isMachineLine(line))
    .join("\n")
    .trim();
}

// What the reviewer told the worker so far, oldest first.
export function feedbackNotes(actionTaken: string | null | undefined): string[] {
  return (actionTaken ?? "")
    .split(/\r?\n/)
    .filter(line => NOTE_PATTERN.test(line))
    .map(line => line.replace(NOTE_PATTERN, "").trim())
    .filter(Boolean);
}

// actionTaken with one more note for the worker, on a single line, placed
// before the PLAN line so the plan stays last.
export function appendFeedback(actionTaken: string | null | undefined, text: string): string {
  const note = `NOTE: ${text.replace(/\s+/g, " ").trim()}`;
  const lines = (actionTaken ?? "").split(/\r?\n/).filter(line => line.trim() !== "");
  const planAt = lines.findIndex(line => line.trim().startsWith(PLAN_PREFIX));
  if (planAt < 0) {
    return [...lines, note].join("\n");
  }
  return [...lines.slice(0, planAt), note, ...lines.slice(planAt)].join("\n");
}
