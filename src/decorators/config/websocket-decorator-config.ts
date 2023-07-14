import { WebsocketAuthenticator } from "../../server";

export abstract class WebsocketDecoratorConfig {
  public authenticator: WebsocketAuthenticator;
}
