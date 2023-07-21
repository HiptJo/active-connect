import { WebsocketAuthenticator } from "../websocket/auth/authenticator";
import { WebsocketConnection } from "../websocket/server/connection/connection";

/**
 * Represents the reference to an object method used for websocket routes and outbounds.
 */
export class DecorableFunction {
  /**
   * Creates an instance of DecorableFunction.
   * @param objConfig - The configuration object for the object method.
   * @param objConfig.target - The target object.
   * @param objConfig.propertyKey - The property key of the target object.
   */
  constructor(protected objConfig: { target: any; propertyKey: string }) {}

  /**
   * Returns the decorated function.
   * @returns - The decorated function.
   */
  public get Func(): (...data: any[]) => Promise<any> | any {
    if (
      this.objConfig?.target &&
      this.objConfig.target[this.objConfig.propertyKey]
    ) {
      return this.objConfig.target[this.objConfig.propertyKey].bind(
        this.getBindObject()
      );
    }
    return null;
  }

  /**
   * Returns the bind object.
   * @private
   * @returns - The bind object.
   */
  private getBindObject(): any {
    const prototype = this.objConfig.target.prototype || this.objConfig.target;
    if (!prototype.___data) {
      prototype.___data = {};
    }
    if (!prototype.___data._obj) {
      prototype.___data._obj = new this.objConfig.target.constructor();
    }
    return prototype.___data._obj;
  }
}

/**
 * Represents an authentication error for websocket routes and outbounds.
 */
export class AuthenticationError extends Error {
  readonly isAuthenticationError = true;
  /**
   * Creates an instance of AuthenticationError.
   * @param [message] - The error message.
   */
  constructor(message?: string) {
    super(message);
  }
}

/**
 * Represents the reference to an object method used for websocket routes and outbounds with support for authentication.
 */
export abstract class AuthableDecorableFunction extends DecorableFunction {
  protected authenticator: WebsocketAuthenticator | null = null;

  /**
   * Sets the authenticator for the decorated function.
   * @param authenticator - The websocket authenticator.
   */
  public setAuthenticator(authenticator: WebsocketAuthenticator) {
    this.authenticator = authenticator;
  }

  /**
   * Returns the decorated function with added authentication checks.
   * @returns - The decorated function.
   */
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
          this.sendError(conn, authenticator.unauthenticatedMessage, true);
          throw new AuthenticationError(authenticator.unauthenticatedMessage);
        }
      };
    } else {
      return func;
    }
  }

  /**
   * Checks if the decorated function has an authenticator.
   * @returns - Indicates whether the decorated function has an authenticator.
   */
  public get hasAuthenticator() {
    return this.authenticator != null;
  }

  /**
   * Sends an error message through the websocket connection.
   * @protected
   * @param conn - The websocket connection.
   * @param message - The error message.
   */
  protected abstract sendError(
    conn: WebsocketConnection,
    message: string,
    authError?: boolean
  ): void;
}
