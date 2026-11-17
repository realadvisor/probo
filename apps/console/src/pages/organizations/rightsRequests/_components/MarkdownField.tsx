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

import { Button, IconPencil, Label, Markdown, Textarea } from "@probo/ui";
import { type ReactNode, useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { consoleMarkdownImageOrigins } from "#/lib/markdownImageOrigins";

import { markdownHardBreaks } from "../_lib/markdownHardBreaks";
import { markdownField, markdownProse } from "../variants";

interface MarkdownFieldProps {
  label: ReactNode;
  // The text to render in view mode (may differ from the registered value).
  rendered: string;
  registration: UseFormRegisterReturn;
  placeholder: string;
  error?: string;
  disabled?: boolean;
}

// A textarea with a rendered Markdown view. View mode is the default; the
// textarea only mounts in edit mode but the field stays registered through
// react-hook-form, so saving is unchanged.
export function MarkdownField({
  label,
  rendered,
  registration,
  placeholder,
  error,
  disabled = false,
}: MarkdownFieldProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const { root, head, label: labelClass, view, empty, error: errorClass } = markdownField();
  const showEditor = isEditing && !disabled;

  return (
    <div className={root()}>
      <div className={head()}>
        <Label className={labelClass()}>{label}</Label>
        {!disabled && (
          <Button
            type="button"
            variant="tertiary"
            icon={showEditor ? undefined : IconPencil}
            onClick={() => setIsEditing(editing => !editing)}
          >
            {showEditor
              ? t("rightsRequestDetailsPage.markdown.preview")
              : t("rightsRequestDetailsPage.markdown.edit")}
          </Button>
        )}
      </div>
      {showEditor
        ? (
            <Textarea {...registration} placeholder={placeholder} rows={8} />
          )
        : (
            <div className={view()}>
              {rendered.trim() === ""
                ? (
                    <span className={empty()}>
                      {t("rightsRequestDetailsPage.markdown.empty")}
                    </span>
                  )
                : (
                    <div className={markdownProse()}>
                      <Markdown
                        content={markdownHardBreaks(rendered)}
                        allowedImageOrigins={consoleMarkdownImageOrigins()}
                      />
                    </div>
                  )}
            </div>
          )}
      {error && <span className={errorClass()}>{error}</span>}
    </div>
  );
}
