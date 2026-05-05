import {
  SimulatedFailureDatabaseCaseLiterals,
  getSimulatedFailureCase,
  DbErrorSimulatedFailure,
} from "../../orm/dbService";

export async function checkFailureCase(
  failureCase: SimulatedFailureDatabaseCaseLiterals,
): Promise<void> {
  const currentFailureCase = getSimulatedFailureCase();
  if (currentFailureCase === failureCase) {
    throw new DbErrorSimulatedFailure(`Simulated failure: ${failureCase}`);
  }
}
