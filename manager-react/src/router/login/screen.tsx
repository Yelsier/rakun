import { LoginForm } from "../../components/login-form";

export function ManagerLoginScreen({
  passwordRecoveryEnabled = false,
}: {
  passwordRecoveryEnabled?: boolean
}) {
  return <LoginForm passwordRecoveryEnabled={passwordRecoveryEnabled} />;
}
