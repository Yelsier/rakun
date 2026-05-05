import ContentType from "../../lib/ContentType";
import {
  DataInput,
  DataPopulatedWithoutApiOnly,
  DataFront,
  DataPopulated,
} from "../../lib/types";
import { getRakunBootstrapOptions } from "../../bootstrapState";

export type InputProxy<T extends ContentType> = (
  data: Partial<DataInput<T>>,
) => Partial<DataInput<T>> | Promise<Partial<DataInput<T>>>;

export type OutputProxy<T extends ContentType> = (
  data: DataPopulatedWithoutApiOnly<T>,
) => DataFront<T> | Promise<DataFront<T>>;

export type ApiProxies = {
  input?: Record<string, InputProxy<ContentType>>;
  output?: Record<string, OutputProxy<ContentType>>;
};

export const getInputProxy = (contentTypeName: string) => {
  return getRakunBootstrapOptions()?.proxies?.input?.[contentTypeName] as
    | InputProxy<ContentType>
    | undefined;
};

export const getOutputProxy = (contentTypeName: string) => {
  return getRakunBootstrapOptions()?.proxies?.output?.[contentTypeName] as
    | OutputProxy<ContentType>
    | undefined;
};

export const getProxies = () => ({
  input: getRakunBootstrapOptions()?.proxies?.input ?? {},
  output: getRakunBootstrapOptions()?.proxies?.output ?? {},
});

export const ProxyOutput = (item: DataPopulated<ContentType>) => {
  const outputProxy = getOutputProxy(item._type);
  if (outputProxy) {
    return outputProxy(item);
  }
  return item;
};
