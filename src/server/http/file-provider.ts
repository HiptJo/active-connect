import { ContentProviderDecoratorConfig } from "../../decorators/config/content-provider-decorator-config";
import { AuthableDecorableFunction } from "../function";
import { WebsocketConnection } from "../websocket";

export class FileProvider extends AuthableDecorableFunction {
  constructor(
    public label: string,
    objConfig: { target: any; propertyKey: string }
  ) {
    super(objConfig);
  }

  protected sendError(conn: WebsocketConnection, message: string): void {}

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
