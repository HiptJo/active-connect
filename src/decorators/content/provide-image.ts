import { ImageProvider } from "../../server";
import { HttpServer } from "../../server/http/server";
import { ContentProviderDecoratorConfig } from "../config/content-provider-decorator-config";

export function ProvideImage(accessor: string) {
  return function _ProvideImage(target: any, propertyKey: string) {
    // method annotation
    ContentProviderDecoratorConfig.init(target, propertyKey);

    HttpServer.registerImageProvider(
      new ImageProvider(accessor, { target, propertyKey }).bindDecoratorConfig(
        ContentProviderDecoratorConfig.get(target, propertyKey)
      )
    );
  };
}
