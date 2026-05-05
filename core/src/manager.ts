import {
  type AnyRakunOperationContract,
  createOperationManifest,
  type RakunOperationHttpMethod,
  type RakunOperationKind,
} from "./api/operations/types";
import { createManagerOperationContracts } from "./api/operations/manager-contract";

export type ManagerOperationContracts = ReturnType<
  typeof createManagerOperationContracts
>;
export type ManagerOperationDefinitions = ManagerOperationContracts;

export type ManagerOperationName = keyof ManagerOperationContracts & string;

type OperationInput<TOperation extends AnyRakunOperationContract> =
  TOperation extends {
    input: {
      _output: infer TInput;
    };
  }
    ? [TInput] extends [undefined]
      ? undefined
      : TInput
    : undefined;

type OperationOutput<TOperation extends AnyRakunOperationContract> =
  TOperation extends {
    output: {
      _output: infer TOutput;
    };
  }
    ? TOutput
    : never;

type OperationKind<TOperation extends AnyRakunOperationContract> =
  TOperation extends {
    kind: infer TKind;
  }
    ? TKind
    : never;

type OperationMethod<TOperation extends AnyRakunOperationContract> =
  TOperation extends {
    method: infer TMethod;
  }
    ? TMethod
    : never;

export type ManagerOperationInput<TName extends ManagerOperationName> =
  OperationInput<ManagerOperationContracts[TName]>;

export type ManagerOperationOutput<TName extends ManagerOperationName> =
  OperationOutput<ManagerOperationContracts[TName]>;

export type ManagerOperationKind<TName extends ManagerOperationName> =
  OperationKind<ManagerOperationContracts[TName]>;

export type ManagerOperationMethod<TName extends ManagerOperationName> =
  OperationMethod<ManagerOperationContracts[TName]>;

export type ManagerOperationMeta = {
  kind: RakunOperationKind;
  method: RakunOperationHttpMethod;
  path: string;
};

export const toManagerOperationPath = (name: string) =>
  `/${name.split(".").join("/")}`;

const managerOperationContracts = createManagerOperationContracts();

export { managerOperationContracts };

export const managerOperationManifest = createOperationManifest(
  managerOperationContracts,
);

type ManagerManifest = typeof managerOperationManifest;

export type ManagerQueryOperationName = {
  [TName in keyof ManagerManifest]: ManagerManifest[TName]["kind"] extends "query"
    ? TName
    : never;
}[keyof ManagerManifest];

export type ManagerMutationOperationName = {
  [TName in keyof ManagerManifest]: ManagerManifest[TName]["kind"] extends "mutation"
    ? TName
    : never;
}[keyof ManagerManifest];

export const getManagerOperationMeta = <TName extends ManagerOperationName>(
  name: TName,
) => managerOperationManifest[name];

export const getManagerOperationContract = <TName extends ManagerOperationName>(
  name: TName,
) => managerOperationContracts[name];
