import * as compression from "compression";
import * as express from "express";
import * as bodyParser from "body-parser";
import * as fs from "fs-extra";
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
      this.App.get("/wss", (req: express.Request, res: express.Response) => {
        res.status(200);
        res.end("wss entrypoint");
      });
    }
    this.initializeHttpMethods();
    this.initializeFileProvider();
    this.initializeImageProvider();
  }

  private isServerStarted: boolean = false;
  private initializeServer() {
    this.app = express();
    this.app.use(bodyParser.urlencoded({ extended: true }));
    const t = this;
    this.server = this.app.listen(this.port, function serverStarted() {
      t.isServerStarted = true;
      t.serverStarted();
    });
    this.app.disable("x-powered-by");
    this.app.use(compression());
  }

  private initializeWebsocket() {
    this.websocket = new WebsocketServer(this.server);
  }

  private initializeHttpMethods() {
    const t = this;
    HttpServer.getMethods.forEach(function registerGetMethod(get) {
      t.app.get(get.method, get.callback);
    });
    HttpServer.postMethods.forEach(function registerPostMethod(post) {
      t.app.post(post.method, post.callback);
    });
  }

  public enableLogging() {
    this.websocket.enableLogging();
  }

  private indexCache: Buffer | undefined;
  public setupAngularFileServing(path: string) {
    this.setupAssetFileServing(path);
    const t = this;
    this.app.get(
      "*",
      function serveAngularIndex(req: express.Request, res: express.Response) {
        if (!t.indexCache) {
          fs.readFile(
            `${path}/index.html`,
            function readAngularIndexCallback(
              error: any | null,
              content: Buffer
            ) {
              if (error) {
                res.sendStatus(500);
                throw Error(
                  "Express: Angular File Serving: index.html has not been found"
                );
              }
              res.writeHead(200, { "Content-Type": "text/html" });
              res.end(content, "utf-8");
              t.indexCache = content;
            }
          );
        } else {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(t.indexCache, "utf-8");
        }
      }
    );
  }
  public setupAssetFileServing(path: string) {
    this.app.use(express.static(path));
  }

  private basicAuthenticationEnabled = false;
  private credentials: Array<{ user: string; password: string }> = new Array();
  public enableBasicAuthentication() {
    if (!this.basicAuthenticationEnabled) {
      const t = this;
      this.basicAuthenticationEnabled = true;
      this.app.use(function auth(
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) {
        if ("OPTIONS" == req.method) {
          res.send("{}");
        } else {
          // -----------------------------------------------------------------------
          // authentication middleware
          const b64auth = (req.headers.authorization || "").split(" ")[1] || "";
          const [user, password] = Buffer.from(b64auth, "base64")
            .toString()
            .split(":");

          // Verify user and password are set and correct
          const authorized = t.credentials.filter(
            (a) => a.user == user && a.password == password
          );

          if (authorized.length > 0) {
            // Access granted...
            return next();
          } else {
            // Access denied...
            res.set("WWW-Authenticate", 'Basic realm="401"'); // change this
            res.status(401).send("Authentication required."); // custom message
            return;
          }
        }
        return next();
      });
    }
  }
  public addBasicCredentials(user: string, password: string) {
    this.credentials.push({ user: user, password: password });
  }

  private initializeFileProvider() {
    const sendFile = this.sendFile;
    const t = this;
    HttpServer.fileProvider.forEach(function provideFileForEach(provider) {
      t.app.get(
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
      t.app.get(
        `/file/${provider.label}/:id/:auth/:filename`,
        async function provideFile(
          req: express.Request,
          res: express.Response
        ) {
          const id = req.params.id;
          const auth = req.params.auth;
          await sendFile(res, provider, id, auth);
        }
      );
      t.app.get(
        `/file/${provider.label}/:id`,
        async function provideFileWithoutAuth(
          req: express.Request,
          res: express.Response
        ) {
          const id = req.params.id;
          await sendFile(res, provider, id);
        }
      );
      t.app.get(
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
    const t = this;
    HttpServer.imageProvider.forEach(function registerImageProvider(provider) {
      t.app.get(
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
      t.app.get(
        `/image/${provider.label}/:id`,
        async function provideFileWithoutAuth(
          req: express.Request,
          res: express.Response
        ) {
          const id = req.params.id;
          await sendImage(res, provider, id);
        }
      );
      t.app.get(
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
    this.serverStartedResolves.forEach(function resolveServerStarted(r) {
      r(true);
    });
  }
  public async awaitStart(): Promise<boolean> {
    if (this.isServerStarted) return true;
    const t = this;
    return new Promise(function onServerStarted(resolve) {
      t.serverStartedResolves.push(resolve);
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

  public getWebsocketInstance(): WebsocketServer | null {
    return this.websocket;
  }

  public stop() {
    this.server.close();
    if (this.supportWebsocket) this.websocket.close();
  }
}
