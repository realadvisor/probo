// Copyright (c) 2025-2026 Probo Inc <hello@probo.com>.
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
  formatDatetime,
  formatError,
  getRightsRequestStateVariant,
  type GraphQLError,
  toDateInput,
} from "@probo/helpers";
import { dateFormat } from "@probo/i18n";
import {
  ActionDropdown,
  Badge,
  Button,
  Card,
  DropdownItem,
  Field,
  IconCircleCheck1,
  IconWarning,
  Input,
  Label,
  Markdown,
  Option,
  Select,
  Textarea,
} from "@probo/ui";
import useToast from "@probo/ui/src/v2/Toaster/useToast";
import { type ReactNode, useState } from "react";
import { Controller, type UseFormRegisterReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  ConnectionHandler,
  type PreloadedQuery,
  usePreloadedQuery,
} from "react-relay";

import type { RightsRequestGraphNodeQuery } from "#/__generated__/core/RightsRequestGraphNodeQuery.graphql";
import { useFormWithSchema } from "#/hooks/useFormWithSchema";
import { useOrganizationId } from "#/hooks/useOrganizationId";
import { consoleMarkdownImageOrigins } from "#/lib/markdownImageOrigins";
import { z } from "#/lib/zod";

import {
  rightsRequestNodeQuery,
  RightsRequestsConnectionKey,
  useDeleteRightsRequest,
  useUpdateRightsRequest,
} from "../../../hooks/graph/RightsRequestGraph";

import { PlanStatusBadge, PlanStepMark } from "./_components/PlanStatus";
import { markdownHardBreaks } from "./_lib/markdownHardBreaks";
import { canApprovePlan, parsePlan, stripPlanLines } from "./_lib/rightsRequestPlan";

const updateRequestSchema = z.object({
  requestType: z.enum(["ACCESS", "DELETION", "RECTIFICATION", "PORTABILITY", "OBJECTION", "COMPLAINT"]),
  requestState: z.enum(["TODO", "IN_PROGRESS", "DONE", "REJECTED"]),
  dataSubject: z.string().optional(),
  contact: z.string().optional(),
  details: z.string().optional(),
  deadline: z.string().optional(),
  actionTaken: z.string().optional(),
});

type Props = {
  queryRef: PreloadedQuery<RightsRequestGraphNodeQuery>;
};

export default function RightsRequestDetailsPage(props: Props) {
  const data = usePreloadedQuery<RightsRequestGraphNodeQuery>(
    rightsRequestNodeQuery,
    props.queryRef,
  );
  const request = data.node;
  const { i18n, t } = useTranslation();
  const toast = useToast();
  const organizationId = useOrganizationId();

  const updateRequest = useUpdateRightsRequest();

  const connectionId = ConnectionHandler.getConnectionID(
    organizationId,
    RightsRequestsConnectionKey,
  );

  const deleteRequest = useDeleteRightsRequest(
    { id: request.id! },
    connectionId,
  );

  const { register, handleSubmit, formState, control, setValue, watch } = useFormWithSchema(
    updateRequestSchema,
    {
      defaultValues: {
        requestType: request.requestType || "ACCESS",
        requestState: request.requestState || "TODO",
        dataSubject: request.dataSubject || "",
        contact: request.contact || "",
        details: request.details || "",
        deadline: toDateInput(request.deadline),
        actionTaken: request.actionTaken || "",
      },
    },
  );

  const onSubmit = handleSubmit(async (formData: z.infer<typeof updateRequestSchema>) => {
    try {
      await updateRequest({
        id: request.id!,
        requestType: formData.requestType,
        requestState: formData.requestState,
        dataSubject: formData.dataSubject || undefined,
        contact: formData.contact || undefined,
        details: formData.details || undefined,
        deadline: formatDatetime(formData.deadline) ?? null,
        actionTaken: formData.actionTaken || undefined,
      });

      toast.add({
        title: t("rightsRequestDetailsPage.messages.success"),
        description: t("rightsRequestDetailsPage.messages.updated"),
        type: "success",
      });
    } catch (error) {
      toast.add({
        title: t("rightsRequestDetailsPage.messages.error"),
        description: formatError(
          t("rightsRequestDetailsPage.errors.update"),
          error as GraphQLError,
        ),
        type: "error",
      });
    }
  });

  // The plan is read from the stored actionTaken, not the textarea draft, so
  // editing the text does not make the Approve button flicker.
  const plan = parsePlan(request.actionTaken);
  const [isApproving, setIsApproving] = useState(false);
  const canApprove
    = request.canUpdate && canApprovePlan(request.requestState ?? "TODO", plan);

  // Approve only moves the state to IN_PROGRESS; other unsaved edits in the
  // form are left alone and still need an explicit save.
  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await updateRequest({ id: request.id!, requestState: "IN_PROGRESS" });
      setValue("requestState", "IN_PROGRESS");
      toast.add({
        title: t("rightsRequestDetailsPage.messages.success"),
        description: t("rightsRequestDetailsPage.plan.approved"),
        type: "success",
      });
    } catch (error) {
      toast.add({
        title: t("rightsRequestDetailsPage.messages.error"),
        description: formatError(
          t("rightsRequestDetailsPage.errors.update"),
          error as GraphQLError,
        ),
        type: "error",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const detailsDraft = watch("details") ?? "";
  const actionTakenDraft = watch("actionTaken") ?? "";

  const typeOptions = ["ACCESS", "DELETION", "RECTIFICATION", "PORTABILITY", "OBJECTION", "COMPLAINT"] as const;
  const stateOptions = ["TODO", "IN_PROGRESS", "DONE", "REJECTED"] as const;

  return (
    <div className="space-y-6">
      {request.canDelete && (
        <div className="flex items-center justify-end">
          <ActionDropdown>
            <DropdownItem onClick={deleteRequest} variant="danger">
              {t("rightsRequestDetailsPage.actions.delete")}
            </DropdownItem>
          </ActionDropdown>
        </div>
      )}

      <Card>
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">
                {t(`rightsRequestDetailsPage.types.${(request.requestType || "ACCESS").toLowerCase()}`)}
              </h1>
              <Badge variant="neutral">
                {t(`rightsRequestDetailsPage.types.${(request.requestType || "ACCESS").toLowerCase()}`)}
              </Badge>
              <Badge
                variant={getRightsRequestStateVariant(
                  request.requestState || "TODO",
                )}
              >
                {t(`rightsRequestDetailsPage.states.${(request.requestState || "TODO").toLowerCase()}`)}
              </Badge>
            </div>
          </div>

          <form onSubmit={e => void onSubmit(e)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={control}
                name="requestType"
                render={({ field }) => (
                  <div>
                    <Label>
                      {t("rightsRequestDetailsPage.fields.requestType")}
                      {" "}
                      *
                    </Label>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      {typeOptions.map(option => (
                        <Option
                          key={option}
                          value={option}
                        >
                          {t(`rightsRequestDetailsPage.types.${option.toLowerCase()}`)}
                        </Option>
                      ))}
                    </Select>
                    {formState.errors.requestType
                      ?.message && (
                      <div className="text-red-500 text-sm mt-1">
                        {
                          formState.errors.requestType
                            .message
                        }
                      </div>
                    )}
                  </div>
                )}
              />

              <Controller
                control={control}
                name="requestState"
                render={({ field }) => (
                  <div>
                    <Label>
                      {t("rightsRequestDetailsPage.fields.state")}
                      {" "}
                      *
                    </Label>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      {stateOptions.map(option => (
                        <Option
                          key={option}
                          value={option}
                        >
                          {t(`rightsRequestDetailsPage.states.${option.toLowerCase()}`)}
                        </Option>
                      ))}
                    </Select>
                    {formState.errors.requestState
                      ?.message && (
                      <div className="text-red-500 text-sm mt-1">
                        {
                          formState.errors
                            .requestState.message
                        }
                      </div>
                    )}
                  </div>
                )}
              />
            </div>

            <Field
              label={t("rightsRequestDetailsPage.fields.dataSubject")}
              {...register("dataSubject")}
              error={formState.errors.dataSubject?.message}
            />

            <Field
              label={t("rightsRequestDetailsPage.fields.contact")}
              {...register("contact")}
              error={formState.errors.contact?.message}
            />

            <MarkdownField
              label={t("rightsRequestDetailsPage.fields.details")}
              rendered={detailsDraft}
              registration={register("details")}
              placeholder={t("rightsRequestDetailsPage.placeholders.details")}
              error={formState.errors.details?.message}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("rightsRequestDetailsPage.fields.deadline")}</Label>
                <Input type="date" {...register("deadline")} />
                {formState.errors.deadline?.message && (
                  <div className="text-red-500 text-sm mt-1">
                    {formState.errors.deadline.message}
                  </div>
                )}
              </div>
            </div>

            {plan && (
              <div className="rounded-lg border border-border-low bg-subtle p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {t("rightsRequestDetailsPage.plan.title")}
                      </span>
                      <PlanStatusBadge status={plan.status} />
                      {plan.needsHuman && (
                        <Badge variant="warning">
                          <IconWarning size={12} />
                          {t("rightsRequestDetailsPage.plan.needsHuman")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-txt-secondary">{plan.summary}</p>
                    {(plan.approvedBy || plan.approvedAt) && (
                      <p className="text-xs text-txt-tertiary">
                        {t("rightsRequestDetailsPage.plan.approvedBy", {
                          name: plan.approvedBy ?? t("rightsRequestDetailsPage.plan.unknownApprover"),
                          date: plan.approvedAt ? dateFormat(i18n.language, plan.approvedAt) : "",
                        })}
                      </p>
                    )}
                    {plan.completedAt && (
                      <p className="text-xs text-txt-tertiary">
                        {t("rightsRequestDetailsPage.plan.completedAt", {
                          date: dateFormat(i18n.language, plan.completedAt),
                        })}
                      </p>
                    )}
                  </div>
                  {canApprove && (
                    <Button
                      type="button"
                      variant="primary"
                      icon={IconCircleCheck1}
                      disabled={isApproving || formState.isSubmitting}
                      onClick={() => void handleApprove()}
                    >
                      {isApproving
                        ? t("rightsRequestDetailsPage.plan.approving")
                        : t("rightsRequestDetailsPage.plan.approve")}
                    </Button>
                  )}
                </div>
                {plan.steps.length > 0 && (
                  <ul className="space-y-1 text-sm">
                    {plan.steps.map((step, index) => (
                      <li key={index} className="flex gap-2">
                        <PlanStepMark status={step.status} />
                        <span className="shrink-0 font-medium">{step.system}</span>
                        <span className="text-txt-tertiary">—</span>
                        <span className="text-txt-secondary">
                          {step.action}
                          {step.detail && (
                            <span className="text-txt-tertiary">
                              {" · "}
                              {step.detail}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {plan.note && (
                  <div className="text-sm text-txt-warning prose prose-sm max-w-none [&_.prose]:max-w-none [&_.prose]:text-inherit">
                    <Markdown
                      content={plan.note}
                      allowedImageOrigins={consoleMarkdownImageOrigins()}
                    />
                  </div>
                )}
                {canApprove && formState.isDirty && (
                  <p className="text-xs text-txt-tertiary">
                    {t("rightsRequestDetailsPage.plan.approveHint")}
                  </p>
                )}
              </div>
            )}

            {/* The PLAN line is hidden from the rendered view (the card above
                shows it) but stays in the textarea and in what gets saved. */}
            <MarkdownField
              label={t("rightsRequestDetailsPage.fields.actionTaken")}
              rendered={stripPlanLines(actionTakenDraft)}
              registration={register("actionTaken")}
              placeholder={t("rightsRequestDetailsPage.placeholders.actionTaken")}
              error={formState.errors.actionTaken?.message}
            />

            <div className="flex justify-end pt-4">
              {request.canUpdate && (
                <Button
                  type="submit"
                  variant="primary"
                  disabled={formState.isSubmitting}
                >
                  {formState.isSubmitting
                    ? t("rightsRequestDetailsPage.actions.saving")
                    : t("rightsRequestDetailsPage.actions.save")}
                </Button>
              )}
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}

// A textarea with a rendered Markdown view. View mode is the default; the
// textarea only mounts in edit mode but the field stays registered through
// react-hook-form, so saving is unchanged.
function MarkdownField({
  label,
  rendered,
  registration,
  placeholder,
  error,
}: {
  label: ReactNode;
  rendered: string;
  registration: UseFormRegisterReturn;
  placeholder: string;
  error?: string;
}) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button
          type="button"
          variant="tertiary"
          onClick={() => setIsEditing(editing => !editing)}
        >
          {isEditing
            ? t("rightsRequestDetailsPage.markdown.preview")
            : t("rightsRequestDetailsPage.markdown.edit")}
        </Button>
      </div>
      {isEditing
        ? (
            <Textarea {...registration} placeholder={placeholder} rows={6} />
          )
        : (
            <div className="rounded-lg border border-border-low px-3 py-2 text-sm min-h-10">
              {rendered.trim() === ""
                ? (
                    <span className="text-txt-tertiary">
                      {t("rightsRequestDetailsPage.markdown.empty")}
                    </span>
                  )
                : (
                    <div className="prose prose-sm max-w-none [&_.prose]:max-w-none">
                      <Markdown
                        content={markdownHardBreaks(rendered)}
                        allowedImageOrigins={consoleMarkdownImageOrigins()}
                      />
                    </div>
                  )}
            </div>
          )}
      {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
    </div>
  );
}
