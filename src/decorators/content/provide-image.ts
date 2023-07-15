import { ImageProvider } from "../../server";
import { HttpServer } from "../../server/http/server";
import { ContentProviderDecoratorConfig } from "../config/content-provider-decorator-config";

/**
 * Decorator that marks a method as an image provider.
 * The method will be called when a request is made to retrieve an image.
 *
 * Supported Decorators:
 * - `@Auth`
 *
 * @param {string} accessor - The accessor for the image provider.
 *
 * @example
 * The following code initializes the image provider.
 * When running a GET request to '/image/example[/id[/auth]]', this method is called.
 *
 * ```
 * @ProvideImage("example")
 * async provideImage(id: string, auth: string) {
 *   return ProvidedImage.getFromDataURL(
 *       dataUrl,
 *       id,
 *       "Example"
 *     );
 * }
 * ```
 */
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
