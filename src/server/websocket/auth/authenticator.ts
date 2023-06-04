import { WebsocketConnection } from "../connection/connection";

export abstract class WebsocketAuthenticator {
  public abstract readonly label: string;
  public abstract readonly unauthenticatedMessage: string;
  public abstract authenticate(
    conn: WebsocketConnection | string,
    requestData: any
  ): Promise<boolean>;

  public or: WebsocketAuthenticator | null = null;
  public and: WebsocketAuthenticator | null = null;

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

export interface MessageFilter {
  filter(
    response: any | any[],
    connection: WebsocketConnection
  ): number | Promise<number>;
}
