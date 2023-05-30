import { WebsocketConnection } from "../connection/connection";

export class DecorableFunction {
  constructor(protected objConfig: { target: any; propertyKey: string }) {}

  public get Func(): (
    data: any | void,
    connection: WebsocketConnection
  ) => Function {
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
