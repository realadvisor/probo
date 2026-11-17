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
  formatDatetime,
  formatError,
  getRightsRequestStateVariant,
  type GraphQLError,
  toDateInput,
} from "@probo/helpers";
import { usePageTitle } from "@probo/hooks";
import {
  ActionDropdown,
  Badge,
  Button,
  Card,
  DropdownItem,
  Field,
  IconTrashCan,
  Input,
  Option,
  Select,
} from "@probo/ui";
import useToast from "@probo/ui/src/v2/Toaster/useToast";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  ConnectionHandler,
  type PreloadedQuery,
  usePreloadedQuery,
} from "react-relay";

import type { RightsRequestGraphNodeQuery } from "#/__generated__/core/RightsRequestGraphNodeQuery.graphql";
import { useFormWithSchema } from "#/hooks/useFormWithSchema";
import { useOrganizationId } from "#/hooks/useOrganizationId";
import { z } from "#/lib/zod";

import {
  rightsRequestNodeQuery,
  RightsRequestsConnectionKey,
  useDeleteRightsRequest,
  useUpdateRightsRequest,
} from "../../../hooks/graph/RightsRequestGraph";

import { MarkdownField } from "./_components/MarkdownField";
import { PlanCard } from "./_components/PlanCard";
import { appendFeedback, canApprovePlan, feedbackNotes, parsePlan, stripPlanLines } from "./_lib/rightsRequestPlan";
import { rightsRequestDetailsPage } from "./variants";

const typeOptions = ["ACCESS", "DELETION", "RECTIFICATION", "PORTABILITY", "OBJECTION", "COMPLAINT"] as const;
const stateOptions = ["TODO", "IN_PROGRESS", "DONE", "REJECTED"] as const;

const updateRequestSchema = z.object({
  requestType: z.enum(typeOptions),
  requestState: z.enum(stateOptions),
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
  const { t } = useTranslation();
  const toast = useToast();
  const organizationId = useOrganizationId();
  const { root, header, intro, heading, title, subtitle, form, grid, footer }
    = rightsRequestDetailsPage();

  const requestType = request.requestType || "ACCESS";
  const requestState = request.requestState || "TODO";
  const typeLabel = t(`rightsRequestDetailsPage.types.${requestType.toLowerCase()}`);
  const stateLabel = t(`rightsRequestDetailsPage.states.${requestState.toLowerCase()}`);
  const dataSubject = request.dataSubject?.trim() || "";
  const contact = request.contact?.trim() || "";
  const pageTitle = dataSubject || typeLabel;
  const disabled = !request.canUpdate;

  usePageTitle(pageTitle);

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
        requestType,
        requestState,
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
  const canApprove = request.canUpdate === true && canApprovePlan(requestState, plan);

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

  // What the reviewer tells the worker: saved as a note the worker reads, and
  // the request goes back to To Do so the worker proposes again. An approval
  // that has not run yet is withdrawn by this.
  const notes = feedbackNotes(request.actionTaken);
  const [feedback, setFeedback] = useState("");
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const canGiveFeedback
    = request.canUpdate === true && requestState !== "DONE" && requestState !== "REJECTED";

  const handleFeedback = async () => {
    const text = feedback.trim();
    if (!text) {
      return;
    }
    setIsSendingFeedback(true);
    try {
      const actionTaken = appendFeedback(request.actionTaken, text);
      await updateRequest({ id: request.id!, actionTaken, requestState: "TODO" });
      setValue("actionTaken", actionTaken);
      setValue("requestState", "TODO");
      setFeedback("");
      toast.add({
        title: t("rightsRequestDetailsPage.messages.success"),
        description: t("rightsRequestDetailsPage.plan.feedbackSent"),
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
      setIsSendingFeedback(false);
    }
  };

  const detailsDraft = watch("details") ?? "";
  const actionTakenDraft = watch("actionTaken") ?? "";

  return (
    <div className={root()}>
      <div className={header()}>
        <div className={intro()}>
          <div className={heading()}>
            <h1 className={title()}>{pageTitle}</h1>
            {dataSubject && <Badge variant="neutral">{typeLabel}</Badge>}
            <Badge variant={getRightsRequestStateVariant(requestState)}>
              {stateLabel}
            </Badge>
          </div>
          {contact && <p className={subtitle()}>{contact}</p>}
        </div>
        {request.canDelete && (
          <ActionDropdown>
            <DropdownItem icon={IconTrashCan} variant="danger" onClick={deleteRequest}>
              {t("rightsRequestDetailsPage.actions.delete")}
            </DropdownItem>
          </ActionDropdown>
        )}
      </div>

      <Card padded>
        <form onSubmit={e => void onSubmit(e)} className={form()}>
          <div className={grid()}>
            <Field
              label={t("rightsRequestDetailsPage.fields.requestType")}
              error={formState.errors.requestType?.message}
            >
              <Controller
                control={control}
                name="requestType"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    className="w-full"
                    disabled={disabled}
                  >
                    {typeOptions.map(option => (
                      <Option key={option} value={option}>
                        {t(`rightsRequestDetailsPage.types.${option.toLowerCase()}`)}
                      </Option>
                    ))}
                  </Select>
                )}
              />
            </Field>

            <Field
              label={t("rightsRequestDetailsPage.fields.state")}
              error={formState.errors.requestState?.message}
            >
              <Controller
                control={control}
                name="requestState"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    className="w-full"
                    disabled={disabled}
                  >
                    {stateOptions.map(option => (
                      <Option key={option} value={option}>
                        {t(`rightsRequestDetailsPage.states.${option.toLowerCase()}`)}
                      </Option>
                    ))}
                  </Select>
                )}
              />
            </Field>
          </div>

          <div className={grid()}>
            <Field
              label={t("rightsRequestDetailsPage.fields.dataSubject")}
              error={formState.errors.dataSubject?.message}
            >
              <Input {...register("dataSubject")} disabled={disabled} />
            </Field>

            <Field
              label={t("rightsRequestDetailsPage.fields.contact")}
              error={formState.errors.contact?.message}
            >
              <Input {...register("contact")} disabled={disabled} />
            </Field>
          </div>

          <div className={grid()}>
            <Field
              label={t("rightsRequestDetailsPage.fields.deadline")}
              error={formState.errors.deadline?.message}
            >
              <Input type="date" {...register("deadline")} disabled={disabled} />
            </Field>
          </div>

          <MarkdownField
            label={t("rightsRequestDetailsPage.fields.details")}
            rendered={detailsDraft}
            registration={register("details")}
            placeholder={t("rightsRequestDetailsPage.placeholders.details")}
            error={formState.errors.details?.message}
            disabled={disabled}
          />

          {plan && (
            <PlanCard
              plan={plan}
              requestState={requestState}
              notes={notes}
              canApprove={canApprove}
              isApproving={isApproving || formState.isSubmitting}
              showApproveHint={formState.isDirty}
              onApprove={() => void handleApprove()}
              canGiveFeedback={canGiveFeedback}
              feedback={feedback}
              onFeedbackChange={setFeedback}
              isSendingFeedback={isSendingFeedback}
              onSendFeedback={() => void handleFeedback()}
            />
          )}

          {/* The PLAN and NOTE lines are hidden from the rendered view (the
              card above shows them) but stay in the textarea and in what
              gets saved. */}
          <MarkdownField
            label={t("rightsRequestDetailsPage.fields.actionTaken")}
            rendered={stripPlanLines(actionTakenDraft)}
            registration={register("actionTaken")}
            placeholder={t("rightsRequestDetailsPage.placeholders.actionTaken")}
            error={formState.errors.actionTaken?.message}
            disabled={disabled}
          />

          {request.canUpdate && (
            <div className={footer()}>
              <Button type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting
                  ? t("rightsRequestDetailsPage.actions.saving")
                  : t("rightsRequestDetailsPage.actions.save")}
              </Button>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
