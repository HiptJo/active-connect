import * as express from "express";
import * as http from "http";
import { ProvidedFile } from "../../content/files/provided-file";
import { ProvidedImage } from "../../content/images/provided-image";
import { WebsocketServer } from "../websocket/server";
import { FileProvider } from "./file-provider";
import { HttpMethod } from "./http-method";
import { ImageProvider } from "./image-provider";

export class HttpServer {
  private app: express.Application;
  get App(): express.Application {
    return this.app;
  }
  private server: http.Server;
  private websocket: WebsocketServer;
  constructor(private port: number, private supportWebsocket: boolean) {
    this.initializeServer();

    if (this.supportWebsocket) {
      this.initializeWebsocket();
    }
    this.initializeHttpMethods();
    this.initializeFileProvider();
    this.initializeImageProvider();
  }

  private isServerStarted: boolean = false;
  private initializeServer() {
    this.app = express();
    this.server = this.app.listen(this.port, () => {
      this.isServerStarted = true;
      this.serverStarted();
    });
    this.app.disable("x-powered-by");
  }

  private initializeWebsocket() {
    this.websocket = new WebsocketServer(this.server);
  }

  private initializeHttpMethods() {
    HttpServer.getMethods.forEach((get) => {
      this.app.get(get.method, get.callback);
    });
    HttpServer.postMethods.forEach((get) => {
      this.app.post(get.method, get.callback);
    });
  }

  private initializeFileProvider() {
    const sendFile = this.sendFile;
    HttpServer.fileProvider.forEach((provider) => {
      this.app.get(
        `/file/${provider.label}/:id/:auth`,
        async function provideFile(
          req: express.Request,
          res: express.Response
        ) {
          const id = req.params.id;
          const auth = req.params.auth;
          await sendFile(res, provider, id, auth);
        }
      );
      this.app.get(
        `/file/${provider.label}/:id`,
        async function provideFileWithoutAuth(
          req: express.Request,
          res: express.Response
        ) {
          const id = req.params.id;
          await sendFile(res, provider, id);
        }
      );
      this.app.get(
        `/file/${provider.label}`,
        async function provideFileWithoutId(
          req: express.Request,
          res: express.Response
        ) {
          await sendFile(res, provider);
        }
      );
    });
  }
  private initializeImageProvider() {
    const sendImage = this.sendImage;
    HttpServer.imageProvider.forEach((provider) => {
      this.app.get(
        `/image/${provider.label}/:id/:auth`,
        async function provideFile(
          req: express.Request,
          res: express.Response
        ) {
          const id = req.params.id;
          const auth = req.params.auth;
          await sendImage(res, provider, id, auth);
        }
      );
      this.app.get(
        `/image/${provider.label}/:id`,
        async function provideFileWithoutAuth(
          req: express.Request,
          res: express.Response
        ) {
          const id = req.params.id;
          await sendImage(res, provider, id);
        }
      );
      this.app.get(
        `/image/${provider.label}`,
        async function provideFileWithoutId(
          req: express.Request,
          res: express.Response
        ) {
          await sendImage(res, provider);
        }
      );
    });
  }
  private async sendFile(
    res: express.Response,
    provider: FileProvider,
    id?: string,
    auth?: string
  ) {
    try {
      const data: ProvidedFile = await provider.callback(id, auth);
      res.writeHead(200, {
        "Content-Type": data.contentType,
        "Cache-Control": "must-revalidate",
      });
      res.end(data.data);
    } catch (e) {
      res.sendStatus(404);
    }
  }
  private async sendImage(
    res: express.Response,
    provider: ImageProvider,
    id?: string,
    auth?: string
  ) {
    try {
      const data: ProvidedFile = await provider.callback(id, auth);
      res.writeHead(200, {
        "Content-Type": data.contentType,
        "Cache-Control": "must-revalidate",
      });
      res.end(data.data);
    } catch (e) {
      res.sendStatus(404);
    }
  }

  private serverStartedResolves: Array<Function> = [];
  private serverStarted() {
    this.serverStartedResolves.forEach((r) => r(true));
  }
  public async awaitStart(): Promise<boolean> {
    if (this.isServerStarted) return true;
    return new Promise((resolve) => {
      this.serverStartedResolves.push(resolve);
    });
  }

  private static fileProvider: Array<FileProvider> = new Array();
  public static registerFileProvider(
    label: string,
    callback: (id: string, auth: string) => Promise<ProvidedFile>
  ) {
    HttpServer.fileProvider.push(new FileProvider(label, callback));
  }

  private static imageProvider: Array<ImageProvider> = new Array();
  public static registerImageProvider(
    label: string,
    callback: (id: string, auth: string) => Promise<ProvidedImage>
  ) {
    HttpServer.imageProvider.push(new ImageProvider(label, callback));
  }

  private static getMethods: Array<HttpMethod> = new Array();
  public static registerGet(
    method: string,
    callback: (req: Express.Request, res: Express.Response) => void
  ) {
    HttpServer.getMethods.push(new HttpMethod(method, callback));
  }
  private static postMethods: Array<HttpMethod> = new Array();
  public static registerPost(
    method: string,
    callback: (req: Express.Request, res: Express.Response) => void
  ) {
    HttpServer.postMethods.push(new HttpMethod(method, callback));
  }

  public stop() {
    this.server.close();
    if (this.supportWebsocket) this.websocket.close();
  }
}
