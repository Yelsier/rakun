"use client";

import { Permission } from "@rakun-kit/core/client";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { decodeCamelCase } from "@/helpers/decode-camel-case";

export type UnauthorizedProps = {
  message?: string;
  details?: string;
  neededPermission: Permission[];
  anyPermission?: boolean;
};

const UnauthorizedMessage: React.FC<UnauthorizedProps> = ({
  message = "You are not authorized to access this resource.",
  details,
  neededPermission = [],
  anyPermission,
}) => {
  return (
    <Card className="border-red-500 gap-4">
      <CardHeader>
        <CardTitle className="text-destructive">Unauthorized</CardTitle>
      </CardHeader>
      <CardContent className="text-destructive flex flex-col gap-4">
        <p>{message}</p>
        {details && <pre>{details}</pre>}
        {neededPermission && (
          <div>
            <p>
              <b>Needed permission{anyPermission ? " (any)" : ""}:</b>
            </p>
            <ul className="pl-4">
              {neededPermission.map((perm) => (
                <li key={perm} className="ml-4 list-disc">
                  {decodeCamelCase(perm).replaceAll(".", " -> ")}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UnauthorizedMessage;
