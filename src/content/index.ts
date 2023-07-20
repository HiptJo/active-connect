/**
 * @module
 * @description
 * The `content` module in Active-Connect provides functionalities to serve images and other files via HTTP. This module supports WebSocket authenticators, enabling secure access to files and images.

 * File Example:
 * ```javascript
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
 * The file can be accessed via GET /file/example/id/auth.

 * Image Example:
 * ```javascript
 * @ProvideImage("example")
 * async provideImage(id: string, auth: string) {
 *   return ProvidedImage.getFromDataURL(
 *       dataUrl,
 *       id,
 *       "Example"
 *     );
 * }
 * ```
 * The image can be accessed via GET /image/example/id/auth.
 */

export * from "./files/provided-file";
export * from "./files/file-provider";
export * from "./images/provided-image";
export * from "./images/image-provider";

export * from "./decorators/content-provider-decorator-config";
export * from "./decorators/provide-file";
export * from "./decorators/provide-image";
