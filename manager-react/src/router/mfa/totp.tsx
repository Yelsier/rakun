"use client";

import { Controller, useForm } from "react-hook-form";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { toast } from "sonner";

import { useManagerMutation } from "@/client/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useTranslations } from "@/i18n";

type TotpFormProps = {
  challenge: string;
  onSuccess: () => void | Promise<void>;
  onExpired: () => void;
};

type VerifyTotpInput = {
  code: string;
  challenge: string;
};

export default function TotpForm({
  challenge,
  onSuccess,
  onExpired,
}: TotpFormProps) {
  const t = useTranslations();
  const form = useForm<VerifyTotpInput>({
    defaultValues: {
      code: "",
      challenge,
    },
  });

  const { mutate, isPending } = useManagerMutation("manager.auth.totp.verify");

  const handleSubmit = (data: VerifyTotpInput) => {
    mutate(data, {
      onSuccess: async (result: { token: string } | { error: string }) => {
        if ("token" in result) {
          await onSuccess();
        }

        if ("error" in result) {
          form.setError("code", {
            message: result.error,
          });
        }
      },
      onError: (error: unknown) => {
        const isExpiredChallenge =
          typeof error === "object" &&
          error !== null &&
          "key" in error &&
          error.key === "NOT_FOUND";

        if (isExpiredChallenge) {
          onExpired();
          return;
        }

        console.error(error);
        toast.error(
          t('mfa.verifyCodeError'),
        );
      },
    });
  };

  return (
    <Card className="mx-auto w-92">
      <CardHeader>
        <CardTitle>{t("mfa.verifyLogin")}</CardTitle>
        <CardDescription>
          {t("mfa.verifyLoginDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col items-center gap-4"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <Controller
            name="code"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field
                className="flex flex-col items-center gap-4"
                data-invalid={fieldState.invalid}
              >
                <FieldLabel htmlFor="code">{t("account.mfa.verificationCode")}</FieldLabel>
                <InputOTP
                  maxLength={6}
                  id="code"
                  required
                  pattern={REGEXP_ONLY_DIGITS}
                  containerClassName="justify-center"
                  {...field}
                >
                  <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator className="mx-2" />
                  <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-11 *:data-[slot=input-otp-slot]:text-xl">
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <FieldError errors={[fieldState.error]} />
                <Button loading={isPending} type="submit">
                  {t("common.verify")}
                </Button>
              </Field>
            )}
          />
        </form>
      </CardContent>
    </Card>
  );
}
