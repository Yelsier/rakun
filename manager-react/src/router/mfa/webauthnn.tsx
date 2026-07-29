"use client";

import { useEffect, useRef } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { toast } from "sonner";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useManagerClient } from "@/client/react";
import { useTranslations } from "@/i18n";

type WebauthnFormProps = {
  challenge: string;
  onSuccess: () => void | Promise<void>;
};

export default function WebauthnForm({
  challenge,
  onSuccess,
}: WebauthnFormProps) {
  const t = useTranslations();
  const client = useManagerClient();
  const startedForChallengeRef = useRef<string | null>(null);
  const unmountedRef = useRef(false);

  const handleAuthentication = async () => {
    const result = await client.request("manager.auth.webauthn.auth.options", {
      challengeToken: challenge,
    });

    if (!result.options) {
      toast.error(t('mfa.webauthnOptionsError'));
      return;
    }

    try {
      const assertionResp = await startAuthentication({
        optionsJSON: result.options,
      });

      const verifyResult = (await client.request(
        "manager.auth.webauthn.auth.verify",
        {
          challengeToken: challenge,
          response: assertionResp,
        },
      )) as { token?: string };

      if (verifyResult.token) {
        await onSuccess();
      } else {
        toast.error(t('mfa.authenticationFailed'));
      }
    } catch (error) {
      const isAbortError =
        error instanceof Error &&
        (error.name === "AbortError" ||
          error.message.includes("abort signal") ||
          error.message.includes("Cancelling existing WebAuthn API call"));

      if (isAbortError || unmountedRef.current) return;

      toast.error(t('mfa.authenticationFailed'));
      console.log(error);
    }
  };

  useEffect(() => {
    unmountedRef.current = false;

    if (startedForChallengeRef.current === challenge) return;
    startedForChallengeRef.current = challenge;

    void handleAuthentication();

    return () => {
      unmountedRef.current = true;
    };
  }, [challenge]);

  return (
    <Card className="mx-auto w-92">
      <CardHeader>
        <CardTitle>{t("mfa.webauthnTitle")}</CardTitle>
        <CardDescription>
          {t("mfa.webauthnDescription")}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
