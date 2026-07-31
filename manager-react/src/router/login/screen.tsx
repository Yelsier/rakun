import { LoginForm } from "../../components/login-form";
import type { ManagerLoginConfig } from "../shared/types";

export function ManagerLoginScreen({
  passwordRecoveryEnabled = false,
  login,
}: {
  passwordRecoveryEnabled?: boolean;
  login?: ManagerLoginConfig;
}) {
  return (
    <LoginForm
      login={login}
      passwordRecoveryEnabled={passwordRecoveryEnabled}
    />
  );
}
