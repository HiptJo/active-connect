import { WebsocketAuthenticator } from "../websocket/auth/authenticator";

/**
 * Contains configuration used during the initialization phase to ensure different decorators work together.
 */
export abstract class DecoratorConfig {
  /**
   * Refers to an authenticator used for the decorated method.
   */
  public authenticator: WebsocketAuthenticator;
}
