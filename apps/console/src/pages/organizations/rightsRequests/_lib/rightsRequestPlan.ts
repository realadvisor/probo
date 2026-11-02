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

export type PlanStep = {
  system: string;
  action: string;
};

export type Plan = {
  version: number;
  summary: string;
  steps: PlanStep[];
  needsHuman: boolean;
  note: string | null;
};

const PLAN_PREFIX = "PLAN ";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseStep(value: unknown): PlanStep | null {
  if (!isRecord(value)) {
    return null;
  }
  const { system, action } = value;
  if (typeof system !== "string" || typeof action !== "string") {
    return null;
  }
  return { system, action };
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
    note: typeof raw.note === "string" && raw.note.trim() !== "" ? raw.note : null,
  };
}

// A request can be approved from a plan without anyone reading further when
// it is still TODO and the worker did not flag it for a human.
export function canApprovePlan(
  requestState: string,
  plan: Plan | null,
): plan is Plan {
  return requestState === "TODO" && plan !== null && !plan.needsHuman;
}
