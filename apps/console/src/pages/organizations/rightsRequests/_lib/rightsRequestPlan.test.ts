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

import { canApprovePlan, parsePlan, stripPlanLines } from "./rightsRequestPlan";

const planLine = `PLAN ${JSON.stringify({
  version: 1,
  summary: "CRM 1 user · Close 1 contact · suppress · reply FR",
  steps: [
    { system: "SendGrid", action: "Global suppression" },
    { system: "Inbox", action: "Reply: deleted and unsubscribed (FR)" },
  ],
  needsHuman: false,
  note: "",
})}`;

describe("parsePlan", () => {
  it("returns null without a PLAN line", () => {
    expect(parsePlan(null)).toBeNull();
    expect(parsePlan("")).toBeNull();
    expect(parsePlan("INTAKE receipt sent msg:abc")).toBeNull();
  });

  it("parses the PLAN line among other lines", () => {
    const plan = parsePlan(`INTAKE receipt sent msg:abc\n${planLine}\nDONE: all steps`);
    expect(plan).toEqual({
      version: 1,
      summary: "CRM 1 user · Close 1 contact · suppress · reply FR",
      steps: [
        { system: "SendGrid", action: "Global suppression", status: "pending", detail: null },
        { system: "Inbox", action: "Reply: deleted and unsubscribed (FR)", status: "pending", detail: null },
      ],
      needsHuman: false,
      note: null,
      status: "planned",
      approvedBy: null,
      approvedAt: null,
      completedAt: null,
    });
  });

  it("reads the lifecycle fields and falls back on unknown values", () => {
    const plan = parsePlan(
      `PLAN ${JSON.stringify({
        summary: "s",
        status: "done",
        approvedBy: "Jonas",
        approvedAt: "2026-11-02T12:40:00Z",
        completedAt: "2026-11-02T12:45:00Z",
        steps: [
          { system: "SendGrid", action: "suppress", status: "done", detail: "2 lists" },
          { system: "Close", action: "block", status: "failed", detail: "" },
          { system: "Inbox", action: "reply", status: "nonsense" },
        ],
      })}`,
    );
    expect(plan?.status).toBe("done");
    expect(plan?.approvedBy).toBe("Jonas");
    expect(plan?.approvedAt).toBe("2026-11-02T12:40:00Z");
    expect(plan?.completedAt).toBe("2026-11-02T12:45:00Z");
    expect(plan?.steps.map(step => [step.status, step.detail])).toEqual([
      ["done", "2 lists"],
      ["failed", null],
      ["pending", null],
    ]);
    expect(parsePlan(`PLAN {"summary":"s","status":"weird"}`)?.status).toBe("planned");
  });

  it("keeps needsHuman and the note", () => {
    const plan = parsePlan(
      `PLAN {"version":1,"summary":"x","steps":[],"needsHuman":true,"note":"2 CRM users for this email"}`,
    );
    expect(plan?.needsHuman).toBe(true);
    expect(plan?.note).toBe("2 CRM users for this email");
  });

  it("drops malformed steps and ignores invalid JSON", () => {
    expect(parsePlan("PLAN {not json")).toBeNull();
    expect(parsePlan(`PLAN {"steps":[]}`)).toBeNull();
    const plan = parsePlan(
      `PLAN {"summary":"s","steps":[{"system":"CRM"},{"system":"Close","action":"note"},"junk"]}`,
    );
    expect(plan?.steps).toEqual([{ system: "Close", action: "note", status: "pending", detail: null }]);
    expect(plan?.needsHuman).toBe(false);
  });
});

describe("canApprovePlan", () => {
  const plan = parsePlan(planLine);

  it("only approves TODO requests with a plan nobody flagged", () => {
    expect(canApprovePlan("TODO", plan)).toBe(true);
    expect(canApprovePlan("IN_PROGRESS", plan)).toBe(false);
    expect(canApprovePlan("TODO", null)).toBe(false);
    expect(canApprovePlan("TODO", plan && { ...plan, needsHuman: true })).toBe(false);
  });

  it("refuses plans the worker already closed", () => {
    expect(canApprovePlan("TODO", plan && { ...plan, status: "approved" })).toBe(true);
    for (const status of ["done", "blocked", "manual"] as const) {
      expect(canApprovePlan("TODO", plan && { ...plan, status })).toBe(false);
    }
  });
});

describe("stripPlanLines", () => {
  it("removes PLAN lines and keeps the rest", () => {
    expect(stripPlanLines(`INTAKE receipt sent\n${planLine}\n**Done** — all steps`)).toBe(
      "INTAKE receipt sent\n**Done** — all steps",
    );
    expect(stripPlanLines(planLine)).toBe("");
    expect(stripPlanLines(null)).toBe("");
  });
});
