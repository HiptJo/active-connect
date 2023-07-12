import { WebsocketAuthenticator } from "../../server";

/**
 * Contains configuration used during the initialization phase to ensure different decorators work together.
 */
export abstract class WebsocketDecoratorConfig {
  /**
   * Refers to an authenticator used for the decorated method.
   */
  public authenticator: WebsocketAuthenticator;
}
