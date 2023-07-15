import { DecorableFunction } from "../function";

export class HttpMethod extends DecorableFunction {
  constructor(
    public method: string,
    objConfig: { target: any; propertyKey: string }
  ) {
    super(objConfig);
  }
}
