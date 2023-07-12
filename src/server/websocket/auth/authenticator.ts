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

  /**
   * Can contain a reference to another authenticator.
   * When this authenticator instance is used for authentication, either this authenticator or the referred authenticator need to grant permission.
   */
  public orAuthenticator: WebsocketAuthenticator | null = null;
  /**
   * Add another authenticator.
   * When this authenticator instance is used for authentication, either this authenticator or the referred authenticator need to grant permission.
   */
  public or(authenticator: WebsocketAuthenticator): WebsocketAuthenticator {
    if (!this.andAuthenticator) {
      if (!this.orAuthenticator) {
        this.orAuthenticator = authenticator;
      } else throw new Error("Or authenticator is already defined");
    } else throw new Error("And authenticator is already defined");
    return this;
  }

  /**
   * Can contain a reference to another authenticator.
   * When this authenticator instance is used for authentication, this authenticator and the referred authenticator need to grant permission.
   */
  public andAuthenticator: WebsocketAuthenticator | null = null;
  /**
   * Add another authenticator.
   * When this authenticator instance is used for authentication, this authenticator and the referred authenticator need to grant permission.
   */
  public and(authenticator: WebsocketAuthenticator): WebsocketAuthenticator {
    if (!this.orAuthenticator) {
      if (!this.andAuthenticator) {
        this.andAuthenticator = authenticator;
      } else throw new Error("And authenticator is already defined");
    } else throw new Error("Or authenticator is already defined");
    return this;
  }

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
      if (this.andAuthenticator) {
        return await this.andAuthenticator.checkAuthentication(
          conn,
          requestData
        );
      }
      return true;
    }
    if (this.orAuthenticator) {
      return await this.orAuthenticator.checkAuthentication(conn, requestData);
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
