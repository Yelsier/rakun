"use client";

import type { JSX } from "react";

import { useManagerRuntimeAuth } from "@/app/runtime-auth";
import { useManagerNavigation } from "@/state/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "@/i18n";

import TotpForm from "./totp";
import WebauthnForm from "./webauthnn";

type ManagerMfaScreenProps = {
  challenge?: string;
  method?: string;
  expiresAt?: string;
};

export function ManagerMfaScreen({
  challenge,
  method,
  expiresAt,
}: ManagerMfaScreenProps) {
  const t = useTranslations();
  const navigation = useManagerNavigation();
  const { refreshAuth } = useManagerRuntimeAuth();

  const navigateToManagerRoot = () => {
    if (navigation.replacePath) {
      navigation.replacePath("/");
      return;
    }

    navigation.pushPath?.("/");
  };

  const completeAuth = async () => {
    const authenticated = await refreshAuth();

    if (authenticated) {
      navigateToManagerRoot();
    }
  };

  const goToLogin = () => {
    navigation.replacePath?.("/login");
  };

  if (expiresAt && new Date(expiresAt) < new Date()) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("mfa.challengeExpired")}</CardTitle>
          <CardDescription>
            {t("mfa.challengeExpiredDescription")}
          </CardDescription>
        </CardHeader>

        <CardFooter className="flex-col gap-2">
          <Button className="w-full" onClick={goToLogin} type="button">
            {t("login.submit")}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const methodsMap: Record<string, JSX.Element> = challenge
    ? {
        totp: (
          <TotpForm
            challenge={challenge}
            onSuccess={completeAuth}
            onExpired={goToLogin}
          />
        ),
        webauthn: (
          <WebauthnForm challenge={challenge} onSuccess={completeAuth} />
        ),
      }
    : {};

  return (
    methodsMap[method ?? ""] || (
      <div>{t("mfa.unsupportedMethod")}</div>
    )
  );
}
