"use client";

import type * as React from "react";
import { useFormStatus } from "react-dom";

import { LoaderIcon } from "@/components/icons";
import { Button } from "./ui/button";

type SubmitButtonProps = React.ComponentProps<typeof Button> & {
  isSuccessful: boolean;
};

export function SubmitButton({
  children,
  isSuccessful,
  disabled,
  type,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  const isDisabled = pending || isSuccessful || !!disabled;

  return (
    <Button
      {...props}
      className={["relative", props.className].filter(Boolean).join(" ")}
      aria-disabled={isDisabled}
      disabled={isDisabled}
      // default нь submit, гэхдээ Google дээр type="button" гэж override хийж болно
      type={type ?? (pending ? "button" : "submit")}
    >
      {children}

      {(pending || isSuccessful) && (
        <span className="absolute right-4 animate-spin">
          <LoaderIcon />
        </span>
      )}

      <output aria-live="polite" className="sr-only">
        {pending || isSuccessful ? "Loading" : "Submit form"}
      </output>
    </Button>
  );
}
