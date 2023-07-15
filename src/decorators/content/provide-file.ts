import { FileProvider } from "../../server";
import { HttpServer } from "../../server/http/server";
import { ContentProviderDecoratorConfig } from "../config/content-provider-decorator-config";

/**
 * Decorator that marks a method as a file provider.
 * The method will be called when a request is made to retrieve a file.
 *
 * Supported Decorators:
 * - `@Auth`
 *
 * @param accessor - The accessor for the file provider.
 *
 *
 * @example
 * The following code initializes the file provider.
 * When running a GET request to '/file/example[/id[/auth]]', this method is called.
 * Supports authenticators like websocket decorators do.
 *
 * ```
 * @ProvideFile("example")
 * @Auth(new Authenticator(4)) // optional
 * async provideFile(id: string, auth: string) {
 *   return new ProvidedFile(
 *     +id,
 *     "Example",
 *     content,
 *     contentType
 *   );
 * }
 * ```
 */
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
