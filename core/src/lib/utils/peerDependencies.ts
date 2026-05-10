import { createRequire } from "module";

const requireFromApp = createRequire(`${process.cwd()}/package.json`);
const requireFromPackage = createRequire(import.meta.url);

const originalMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};

export const requirePeerDependency = <T>(
  packageName: string,
  installCommand: string,
  details: string,
): T => {
  try {
    return requireFromApp(packageName) as T;
  } catch (error) {
    try {
      return requireFromPackage(packageName) as T;
    } catch {
      // Keep the app-level error below because it gives users the install
      // location that matters when Rakun is consumed as a package.
    }

    throw new Error(
      [
        `Rakun could not load peer dependency "${packageName}".`,
        details,
        `Install it in your app with: ${installCommand}`,
        `If it is already installed, rebuild native dependencies and use a Node.js LTS version.`,
        `Original error: ${originalMessage(error)}`,
      ].join(" "),
    );
  }
};
