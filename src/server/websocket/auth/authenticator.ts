import { WebsocketConnection } from "../connection/connection";

export abstract class WebsocketAuthenticator {
  public abstract readonly label: string;
  public abstract authenticate(
    conn: WebsocketConnection | string,
    requestData: any
  ): Promise<boolean>;
}

export interface MessageFilter {
  filter(
    response: any | any[],
    connection: WebsocketConnection
  ): number | Promise<number>;
}
