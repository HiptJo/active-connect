/**
 * Represents an HTTP response.
 * @interface
 */
export interface HttpResponse {
  /**
   * The content of the response.
   * @type {any}
   */
  content: any;
  /**
   * The content type of the response.
   * @type {string | null | undefined}
   */
  contentType: string | null | undefined;
  /**
   * The status code of the response.
   * @type {number}
   */
  status: number;
  /**
   * The content encoding of the response.
   * @type {"binary" | "base64" | null | undefined}
   */
  contentEncoding: "binary" | "base64" | null | undefined;
}
