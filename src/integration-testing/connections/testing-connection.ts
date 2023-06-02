import { WebsocketConnection } from "../..";
import { JsonParser } from "../../json/json-parser";
import { WebsocketOutbounds } from "../../server/websocket/routing/outbound";

export abstract class TestingConnectionWrapper<T> extends WebsocketConnection {
  private expectedMethodCalled: boolean = false;

  public constructor(
    token: string | undefined,
    protected expectedMethod: string,
    protected callback: (v: T) => any
  ) {
    super(null);
    if (token) this.token = token;
    WebsocketOutbounds.sendToConnection(this);
  }

  abstract handleReceivedMessages(data: { method: string; value: any }): void;

  public send(method: string, value: T) {
    // parsing the string provides real data situation (date parsing, ...)
    const parsedValue = JsonParser.parse(JsonParser.stringify(value));
    this.handleReceivedMessages({ method, value: parsedValue });
    if (method == this.expectedMethod && !this.expectedMethodCalled) {
      this.callback(parsedValue);
      this.expectedMethodCalled = true;
    } else if (method == "message.error") {
      fail(parsedValue);
    }
  }

  public static waitToSucceed(done: () => any) {
    setTimeout(done, 4000);
  }
}

export abstract class UpdateTestingConnectionWrapper<
  T,
  R
> extends TestingConnectionWrapper<T> {
  protected updateInformCalledStatus: number = 0;
  public constructor(
    token: string,
    protected updateInformMethod: string,
    protected updateInformCallback: (v: T) => any,
    protected dataUpdateMethod: string,
    protected dataUpdateCallback: (v: R) => any
  ) {
    super(token, updateInformMethod, updateInformCallback);
  }

  public send(method: string, value: T | R) {
    this.handleReceivedMessages({ method, value });
    if (
      method == this.updateInformMethod &&
      this.updateInformCalledStatus == 0
    ) {
      this.updateInformCalledStatus = 1;
      this.updateInformCallback(<T>value);
    } else if (
      this.updateInformCalledStatus == 1 &&
      method == this.dataUpdateMethod
    ) {
      this.updateInformCalledStatus = 2;
      this.dataUpdateCallback(<R>value);
    } else if (method == "message.error") {
      fail(value);
    }
  }
}

export abstract class TrippleTestingConnectionWrapper<
  T,
  R,
  S
> extends UpdateTestingConnectionWrapper<R, S> {
  public constructor(
    token: string,
    protected dataReceivedMethod: string,
    protected dataReceivedCallback: (v: T) => any,
    protected updateInformMethod: string,
    protected updateInformCallback: (v: R) => any,
    protected dataUpdateMethod: string,
    protected dataUpdateCallback: (v: S) => any,
    protected repeatLast?: boolean
  ) {
    super(
      token,
      updateInformMethod,
      updateInformCallback,
      dataUpdateMethod,
      dataUpdateCallback
    );
  }

  public send(method: string, value: T | R | S) {
    this.handleReceivedMessages({ method, value });
    if (
      method == this.dataReceivedMethod &&
      this.updateInformCalledStatus == -1
    ) {
      this.dataReceivedCallback(<T>value);
      this.updateInformCalledStatus = 0;
    } else if (
      method == this.updateInformMethod &&
      this.updateInformCalledStatus == 0
    ) {
      this.updateInformCalledStatus = 1;
      this.updateInformCallback(<R>value);
    } else if (
      (this.updateInformCalledStatus == 1 ||
        (this.updateInformCalledStatus == 2 && this.repeatLast)) &&
      method == this.dataUpdateMethod
    ) {
      this.updateInformCalledStatus = 2;
      this.dataUpdateCallback(<S>value);
    } else if (method == "message.error") {
      fail(value);
    }
  }
}
