import { HttpServer } from "../../server/http/server";

export function ProvideFile(
  accessor: string,
  defaultCacheDuration: number = 0
) {
  return function _ProvideFile(target: any, propertyKey: string) {
    HttpServer.registerFileProvider(
      accessor,
      target[propertyKey].bind(target.___data),
      defaultCacheDuration
    );
  };
}
