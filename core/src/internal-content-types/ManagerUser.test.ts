import { describe, expect, it } from "bun:test";

import { isBcryptHash } from "../api/utils/passwords";
import { ManagerUser } from "./ManagerUser";
import { applyManagerUserHooks } from "./ManagerUserHooks";

describe("ManagerUser hooks", () => {
  applyManagerUserHooks();

  it("hashes passwords before insert", async () => {
    const hashed = await ManagerUser.hooks?.beforeInsert?.({
      data: {
        _type: "ManagerUser",
        user: "Yago",
        email: "yago@example.com",
        password: "secret",
      },
      context: {} as never,
    });

    expect(hashed?.password).not.toBe("secret");
    expect(isBcryptHash(String(hashed?.password))).toBe(true);
  });

  it("removes empty passwords before update", async () => {
    const next = await ManagerUser.hooks?.beforeUpdate?.({
      id: "user-id",
      data: {
        password: "",
        user: "Yago",
      },
      context: {} as never,
    });

    expect(next).toEqual({ user: "Yago" });
  });

  it('rejects MFA state changes made through generic CMS updates', () => {
    expect(() =>
      ManagerUser.hooks?.beforeUpdate?.({
        id: 'user-id',
        data: {
          twoFactorEnabled: false,
        },
        context: {
          requestContext: {},
        } as never,
      }),
    ).toThrow('FORBIDDEN')
  })
});
