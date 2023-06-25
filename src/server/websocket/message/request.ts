import { WebsocketConnection } from "../connection/connection";

/**
 * This represents the model of a websocket request. It is used to wrap data once it has been received by the server
 */
export class WebsocketRequest {
  /**
   * The method of the request.
   */
  public method: string;
  /**
   * The data associated with the request
   */
  public data: any;
  /**
   * The websocket connection associated with the request.
   */
  public connection: WebsocketConnection;
  /**
   * The optional message ID of the request.
   * This ID can be used to associate requests and responses.
   */
  public messageId: number | null;

  /**
   * Creates an instance of WebsocketRequest.
   * @constructor
   * @param method - The method of the request.
   * @param data - The data associated with the request.
   * @param connection - The websocket connection associated with the request.
   * @param [messageId] - The optional message ID of the request.
   */
  constructor(
    method: string,
    data: any,
    connection: WebsocketConnection,
    messageId?: number
  ) {
    this.method = method;
    this.data = data;
    this.connection = connection;
    this.messageId = messageId || null;
  }
}
