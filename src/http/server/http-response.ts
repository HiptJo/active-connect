import { Response } from "express";
import { OutgoingHttpHeaders } from "http";

/**
 * Represents an HTTP response.
 * @interface
 */
export class HttpResponse {
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
  /**
   * Headers of the http response
   */
  headers?: OutgoingHttpHeaders | undefined;

  static redirect(url: string): HttpResponse {
    const response = new HttpResponse();
    response.content = url;
    response.contentType = "REDIRECT";
    response.status = 0;
    response.contentEncoding = null;
    return response;
  }
}

/**
 * Represents an HTTP Response.
 * @interface
 * @extends express.Response
 */
export interface HttpInlineResponse extends Response {}
