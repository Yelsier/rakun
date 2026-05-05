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

type WebauthnFormProps = {
  challenge: string;
  onSuccess: () => void;
};

export default function WebauthnForm({
  challenge,
  onSuccess,
}: WebauthnFormProps) {
  const client = useManagerClient();
  const startedForChallengeRef = useRef<string | null>(null);
  const unmountedRef = useRef(false);

  const handleAuthentication = async () => {
    const result = await client.request("manager.auth.webauthn.auth.options", {
      challengeToken: challenge,
    });

    if (!result.options) {
      toast.error("Failed to get authentication options. Please try again.");
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
        onSuccess();
      } else {
        toast.error("Authentication failed. Please try again.");
      }
    } catch (error) {
      const isAbortError =
        error instanceof Error &&
        (error.name === "AbortError" ||
          error.message.includes("abort signal") ||
          error.message.includes("Cancelling existing WebAuthn API call"));

      if (isAbortError || unmountedRef.current) return;

      toast.error("Authentication failed. Please try again.");
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
        <CardTitle>Complete WebAuthn Authentication</CardTitle>
        <CardDescription>
          Please complete the WebAuthn authentication process using your
          registered device. Follow the prompts on your device to authenticate
          and access your account securely.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
