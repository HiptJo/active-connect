import { DecorableFunction } from "../function";

/**
 * Represents an HTTP method.
 */
export class HttpMethod extends DecorableFunction {
  /**
   * Creates a new instance of the `HttpMethod` class.
   * @param method - The HTTP method.
   * @param objConfig - The configuration object containing the target and property key.
   */
  constructor(
    public method: string,
    objConfig: { target: any; propertyKey: string }
  ) {
    super(objConfig);
  }
}
