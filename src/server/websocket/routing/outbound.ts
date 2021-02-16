import { WebsocketConnection } from "../connection/connection";

export interface WebsocketAuthorizationCheckable {
  checkAuth(authToken: string): Promise<boolean>;
}

export class Outbound {
  constructor(
    public method: string,
    public func: (connection: WebsocketConnection) => Promise<any>,
    public requestingRequired?: boolean,
    public auth?: Array<WebsocketAuthorizationCheckable>
  ) {}
}

export class WebsocketOutbound {
  private static outbounds: Array<Outbound> = [];

  public sendToConnection(connection: WebsocketConnection) {
    WebsocketOutbound.outbounds.forEach(
      async (o) => await this.sendOutbound(o, connection)
    );
  }

  private async sendOutbound(
    outbound: Outbound,
    connection: WebsocketConnection
  ) {
    const res = await outbound.func(connection);
    connection.send(outbound.method, res);
  }

  public async requestOutbound(
    method: string,
    connection: WebsocketConnection
  ) {
    const outbounds = WebsocketOutbound.outbounds.filter(
      (o) => o.method === method
    );
    if (outbounds.length > 0) {
      await this.sendOutbound(outbounds[0], connection);
    } else {
      throw Error(`Websocket: Outbound ${method} has not been found.`);
    }
  }
}
