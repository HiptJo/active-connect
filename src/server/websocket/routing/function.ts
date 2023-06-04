import { WebsocketAuthenticator } from "../auth/authenticator";
import { WebsocketConnection } from "../connection/connection";

export class DecorableFunction {
  constructor(protected objConfig: { target: any; propertyKey: string }) {}

  public get Func(): (...data: any[]) => Promise<any> | any {
    if (
      this.objConfig?.target &&
      this.objConfig.target[this.objConfig.propertyKey]
    )
      return this.objConfig.target[this.objConfig.propertyKey].bind(
        this.getBindObject()
      );
    return null;
  }

  private getBindObject(): any {
    if (!this.objConfig.target.___data) {
      this.objConfig.target.___data = {};
    }
    if (!this.objConfig.target.___data._obj) {
      this.objConfig.target.___data._obj =
        new this.objConfig.target.constructor();
    }
    return this.objConfig.target.___data._obj;
  }
}

export class AuthenticationError extends Error {
  readonly isAuthenticationError = true;
  constructor(message?: string) {
    super(message);
  }
}

export class AuthableDecorableFunction extends DecorableFunction {
  private authenticator: WebsocketAuthenticator | null = null;
  public setAuthenticator(authenticator: WebsocketAuthenticator) {
    this.authenticator = authenticator;
  }

  public get Func(): (...data: any[]) => Promise<any> | any {
    const func = super.Func;
    const authenticator = this.authenticator;
    if (func && authenticator) {
      return async function checkAuthentication(...data: any[]) {
        const conn: WebsocketConnection = data.length == 1 ? data[0] : data[1];
        const requestData = data.length == 2 ? data[0] : null;
        if (await authenticator.checkAuthentication(conn, requestData)) {
          return func(...data);
        } else {
          conn.send("m.error", authenticator.unauthenticatedMessage);
          throw new AuthenticationError(
            "Could not Authenticate for authenticator=" + authenticator.label
          );
        }
      };
    } else {
      return func;
    }
  }

  public get hasAuthenticator() {
    return this.authenticator != null;
  }
}
