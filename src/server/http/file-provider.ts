import { ContentProviderDecoratorConfig } from "../../decorators/config/content-provider-decorator-config";
import { AuthableDecorableFunction } from "../function";
import { WebsocketConnection } from "../websocket";

/**
 * Represents a file provider for serving files.
 */
export class FileProvider extends AuthableDecorableFunction {
  /**
   * Creates a new instance of the `FileProvider` class.
   * @param label - The label of the file provider.
   * @param objConfig - The configuration object containing the target and property key.
   */
  constructor(
    public label: string,
    objConfig: { target: any; propertyKey: string }
  ) {
    super(objConfig);
  }

  /**
   * Handles errors during the process
   *
   * @param conn - empty (unused)
   * @param message - error message
   */
  protected sendError(conn: WebsocketConnection, message: string): void {
    throw Error(
      "Error while running FileProvider (" + this.label + "): " + message
    );
  }

  private decoratorConfigReference: ContentProviderDecoratorConfig;

  /**
   * Binds the decorator configuration reference to the file provider.
   * @param reference - The decorator configuration reference.
   * @returns - The file provider instance.
   */
  public bindDecoratorConfig(reference: ContentProviderDecoratorConfig) {
    this.decoratorConfigReference = reference;
    return this;
  }

  /**
   * Loads the decorator configuration from the bound reference.
   */
  public loadDecoratorConfig() {
    if (this.decoratorConfigReference) {
      if (this.decoratorConfigReference.authenticator) {
        this.setAuthenticator(this.decoratorConfigReference.authenticator);
      }
    }
  }
}
