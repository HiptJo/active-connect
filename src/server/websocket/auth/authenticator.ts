import { WebsocketConnection } from "../connection/connection";

/**
 * Authenticators are used to check authentication when a client either sends a request (route) or when data should be sent to the client (outbound).
 * Override the authenticate method to implement authentication functionality.
 */
export abstract class WebsocketAuthenticator {
  /**
   * A label that represents the authenticator.
   */
  public abstract readonly label: string;

  /**
   * The message to send when the client is not authenticated.
   */
  public abstract readonly unauthenticatedMessage: string;

  /**
   * Authenticates the WebSocket connection.
   * @param conn - The WebSocket connection or its identifier.
   * @param requestData - Additional data associated with the request.
   * @returns A Promise that resolves to a boolean indicating if the authentication is successful.
   */
  public abstract authenticate(
    conn: WebsocketConnection | string,
    requestData: any
  ): Promise<boolean>;

  public or: WebsocketAuthenticator | null = null;
  public and: WebsocketAuthenticator | null = null;

  /**
   * Checks the authentication for the WebSocket connection.
   * @param conn - The WebSocket connection or its identifier.
   * @param requestData - Additional data associated with the request.
   * @returns A Promise that resolves to a boolean indicating if the authentication is successful.
   */
  public async checkAuthentication(
    conn: WebsocketConnection | string,
    requestData: any
  ): Promise<boolean> {
    if (await this.authenticate(conn, requestData)) {
      if (this.and) {
        return await this.and.checkAuthentication(conn, requestData);
      }
      return true;
    }
    if (this.or) {
      return await this.or.checkAuthentication(conn, requestData);
    }
    return false;
  }
}

/**
 * Represents a message filter used to categorize messages.
 * It can be used to match outbound subscriptions to specific conditions or trigger the re-delivery of specific data.
 */
export interface MessageFilter {
  /**
   * Filters the response based on the connection.
   * @param response - The response data to be filtered.
   * @param connection - The WebSocket connection.
   * @returns A number or a Promise that resolves to a number representing the filter result.
   */
  filter(
    response: any | any[],
    connection: WebsocketConnection
  ): number | Promise<number>;
}
