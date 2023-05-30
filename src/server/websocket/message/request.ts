import { WebsocketConnection } from "../connection/connection";

export class WebsocketRequest {
  constructor(
    public method: string,
    public data: any,
    public connection: WebsocketConnection,
    public messageId?: number
  ) {}
}
