import { HttpServer } from "../../server/http/server";

export function ProvideImage(accessor: string) {
  return function (target: any, propertyKey: string) {
    HttpServer.registerImageProvider(
      accessor,
      target[propertyKey].bind(target.___data)
    );
  };
}
