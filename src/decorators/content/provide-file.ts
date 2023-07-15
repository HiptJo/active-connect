import { FileProvider } from "../../server";
import { HttpServer } from "../../server/http/server";
import { ContentProviderDecoratorConfig } from "../config/content-provider-decorator-config";

export function ProvideFile(accessor: string) {
  return function _ProvideFile(target: any, propertyKey: string) {
    // method annotation
    ContentProviderDecoratorConfig.init(target, propertyKey);

    HttpServer.registerFileProvider(
      new FileProvider(accessor, { target, propertyKey }).bindDecoratorConfig(
        ContentProviderDecoratorConfig.get(target, propertyKey)
      )
    );
  };
}
