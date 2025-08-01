import * as bodyParser from "body-parser";
import * as compression from "compression";
import * as express from "express";
import * as fs from "fs-extra";
import * as http from "http";

import { FileProvider } from "../../content/files/file-provider";
import { HttpMethod } from "./http-method";
import { ImageProvider } from "../../content/images/image-provider";
import { HttpResponse } from "./http-response";
import { ProvidedFile, ProvidedImage } from "../../content";
import { WebsocketServer } from "../../";
import { httpLogger } from "../../logger/logger";

/**
 * Represents an HTTP server.
 */
export class HttpServer {
  private app: express.Application;
  private server: http.Server;
  private websocket: WebsocketServer;
  private cookieName: string | null = null;

  /**
   * Creates a new instance of the `HttpServer` class.
   * @param port - The port number for the server to listen on.
   * @param supportWebsocket - Determines whether to support WebSocket connections.
   */
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

  /**
   * Gets the underlying Express application instance.
   * @returns The Express application instance.
   */
  get App(): express.Application {
    return this.app;
  }

  private isServerStarted: boolean = false;

  private initializeServer() {
    httpLogger.info("Initializing http server");
    this.app = express();
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.use(bodyParser.json());
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
      t.app.get(get.method, t.handleRequest(get));
    });
    HttpServer.postMethods.forEach(function registerPostMethod(post) {
      t.app.post(post.method, t.handleRequest(post));
    });
    HttpServer.putMethods.forEach(function registerPutMethod(put) {
      t.app.put(put.method, t.handleRequest(put));
    });
    HttpServer.deleteMethods.forEach(function registerDeleteMethod(del) {
      t.app.delete(del.method, t.handleRequest(del));
    });
  }

  /**
   * Defines the name property for the auth cookie. This cookie is used for FileProvider/ImageProvider Authentication.
   *
   * @param name the name of the cookie used for authentication.
   */
  public setCookieName(name: string) {
    this.cookieName = name;
  }

  /**
   * Returns the name property for the auth cookie. This cookie is used for FileProvider/ImageProvider Authentication.
   * Returns null if cookie authentication is disabled.
   *
   * @returns The the name of the cookie used for authentication or null if cookies are disabled for authentication.
   */
  public getCookieName() {
    return this.cookieName;
  }

  private handleRequest(method: HttpMethod): express.RequestHandler {
    return (req: express.Request, res: express.Response, next: Function) => {
      method
        .Func(req, res)
        .then(function requestCompleted(response: HttpResponse) {
          if (response) {
            if (response.headers && response.contentType) {
              response.headers.contentType = response.contentType;
            }
            if (response.contentType == "REDIRECT" && response.status == 0) {
              httpLogger.http(
                `${req.method} ${method.method} 302 REDIRECT ${response.content}`
              );
              res.redirect(response.content);
            } else {
              if (response.contentType) {
                httpLogger.http(`${req.method} ${method.method} 500`);
                res.writeHead(
                  response.status || 500,
                  response.headers || {
                    "Content-Type": response.contentType,
                  }
                );
              } else {
                httpLogger.http(`${req.method} ${method.method} 500`);
                res.writeHead(
                  response.status || 500,
                  response.headers || {
                    "Content-Type": response.contentType,
                  }
                );
              }
              httpLogger.http(`${req.method} ${method.method} 200`);
              res.end(response.content, response.contentEncoding);
            }
          }
        })
        .catch((err: any) => {
          const status = this.getErrorCode(err);
          httpLogger.http(`${req.method} ${method.method} ${status} ${err}`);
          res.status(status);
          res.end("");
          if (status == 500) {
            console.error(err);
          }
        });
    };
  }

  private getErrorCode(err: any): number {
    if (err.BAD_REQUEST) {
      return 400;
    } else if (err.UNAUTHORIZED) {
      return 401;
    } else if (err.FORBIDDEN) {
      return 403;
    } else if (err.NOTFOUND) {
      return 404;
    }
    return 500;
  }

  /**
   * Enables logging for WebSocket connections.
   * @deprecated
   */
  public enableLogging() {
    this.websocket.enableLogging();
  }

  private indexCache: Buffer | undefined;

  /**
   * Sets up file serving for an Angular application.
   * @param path - The path to the Angular application build files.
   */
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
                httpLogger.http(
                  `[ANGULAR SERVING] ${req.method} ${req.path} 500`
                );
                res.sendStatus(500);
                throw Error(
                  "Express: Angular File Serving: index.html has not been found"
                );
              }
              httpLogger.http(
                `[ANGULAR SERVING] ${req.method} ${req.path} 200`
              );
              res.writeHead(200, { "Content-Type": "text/html" });
              res.end(content, "utf-8");
              t.indexCache = content;
            }
          );
        } else {
          httpLogger.http(`[ANGULAR SERVING] ${req.method} ${req.path} 200`);
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(t.indexCache, "utf-8");
        }
      }
    );
  }

  /**
   * Sets up file serving for static assets.
   * @param path - The path to the directory containing the static assets.
   */
  public setupAssetFileServing(path: string) {
    this.app.use(express.static(path));
  }

  private basicAuthenticationEnabled = false;
  private credentials: Array<{ user: string; password: string }> = new Array();

  /**
   * Enables basic authentication for requests.
   */
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
            httpLogger.http(`[BASIC AUTH] ${req.method} ${req.path} 401`);
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

  /**
   * Adds credentials for basic authentication.
   * @param user - The username.
   * @param password - The password.
   */
  public addBasicCredentials(user: string, password: string) {
    this.credentials.push({ user: user, password: password });
  }

  private initializeFileProvider() {
    const sendFile = this.sendFile.bind(this);
    const t = this;
    HttpServer.fileProvider.forEach(function provideFileForEach(provider) {
      provider.loadDecoratorConfig();
      t.app.get(
        `/file/${provider.label}/:id/:auth`,
        async function provideFile(
          req: express.Request,
          res: express.Response
        ) {
          const id = +req.params.id || req.params.id;
          const auth = req.params.auth;
          await sendFile(req, res, provider, id, auth);
        }
      );
      t.app.get(
        `/file/${provider.label}/:id/:auth/:filename`,
        async function provideFile(
          req: express.Request,
          res: express.Response
        ) {
          const id = +req.params.id || req.params.id;
          const auth = req.params.auth;
          await sendFile(req, res, provider, id, auth);
        }
      );
      t.app.get(
        `/file/${provider.label}/:id`,
        async function provideFileWithoutAuth(
          req: express.Request,
          res: express.Response
        ) {
          const id = +req.params.id || req.params.id;
          await sendFile(req, res, provider, id);
        }
      );
      t.app.get(
        `/file/${provider.label}`,
        async function provideFileWithoutId(
          req: express.Request,
          res: express.Response
        ) {
          await sendFile(req, res, provider);
        }
      );
    });
  }

  private initializeImageProvider() {
    const sendImage = this.sendImage.bind(this);
    const t = this;
    HttpServer.imageProvider.forEach(function registerImageProvider(provider) {
      provider.loadDecoratorConfig();
      t.app.get(
        `/image/${provider.label}/:id/:auth`,
        async function provideFile(
          req: express.Request,
          res: express.Response
        ) {
          const id = +req.params.id || req.params.id;
          const auth = req.params.auth;
          await sendImage(req, res, provider, id, auth);
        }
      );
      t.app.get(
        `/image/${provider.label}/:id`,
        async function provideFileWithoutAuth(
          req: express.Request,
          res: express.Response
        ) {
          const id = +req.params.id || req.params.id;
          await sendImage(req, res, provider, id);
        }
      );
      t.app.get(
        `/image/${provider.label}`,
        async function provideFileWithoutId(
          req: express.Request,
          res: express.Response
        ) {
          await sendImage(req, res, provider);
        }
      );
    });
  }

  private async sendFile(
    req: express.Request,
    res: express.Response,
    provider: FileProvider,
    id?: string,
    auth?: string
  ) {
    try {
      const authToken =
        this.parseCookies(req).find((c) => c.name == this.cookieName)?.value ||
        auth;
      const data: ProvidedFile = await provider.Func(id, authToken);

      if (data.data && data.data.startsWith) {
        if (data.data.startsWith("data:")) {
          try {
            const d = data.data.split("base64,")[1];
            res.writeHead(200, {
              "Content-Type": data.contentType,
              "Cache-Control": "must-revalidate",
            });
            res.end(d, "base64");
          } catch (e) {
            console.error(
              'Please ensure that a propper base64 string is returned when starting with "data:"'
            );
          }
          return;
        }
      }
      httpLogger.http(`[FILE] ${req.method} ${req.path} 200`);
      res.writeHead(200, {
        "Content-Type": data.contentType,
        "Cache-Control": "must-revalidate",
      });
      res.end(data.data);
    } catch (e) {
      console.error(e);
      if (e?.isAuthenticationError) {
        httpLogger.http(`[FILE] ${req.method} ${req.path} 401`);
        res.sendStatus(401);
      } else {
        const code = this.getErrorCode(e);
        httpLogger.http(`[FILE] ${req.method} ${req.path} ${code}`);
        res.sendStatus(code);
      }
    }
  }

  private async sendImage(
    req: express.Request,
    res: express.Response,
    provider: ImageProvider,
    id?: string,
    auth?: string
  ) {
    try {
      const authToken =
        this.parseCookies(req).find((c) => c.name == this.cookieName)?.value ||
        auth;

      const data: ProvidedImage = await provider.Func(id, authToken);
      httpLogger.http(`[IMAGE] ${req.method} ${req.path} 200`);
      res.writeHead(200, {
        "Content-Type": data.contentType,
        "Cache-Control": "must-revalidate",
      });
      res.end(data.data, "base64");
    } catch (e) {
      console.error(e);
      if (e?.isAuthenticationError) {
        httpLogger.http(`[IMAGE] ${req.method} ${req.path} 401`);
        res.sendStatus(401);
      } else {
        const code = this.getErrorCode(e);
        httpLogger.http(`[IMAGE] ${req.method} ${req.path} ${code}`);
        res.sendStatus(code);
      }
    }
  }

  private parseCookies(
    req: express.Request
  ): { name: string; value: string }[] {
    return (
      req.headers.cookie?.split(";").map((c: string) => {
        const r = c.split("=");
        return { name: r[0], value: r[1] };
      }) || []
    );
  }

  private serverStartedResolves: Array<Function> = [];

  private serverStarted() {
    httpLogger.info("Http server started on port " + this.port);
    this.serverStartedResolves.forEach(function resolveServerStarted(r) {
      r(true);
    });
  }

  /**
   * Waits for the server to start listening for requests.
   * @returns A promise that resolves when the server has started.
   */
  public async awaitStart(): Promise<boolean> {
    if (this.isServerStarted) return true;
    const t = this;
    return new Promise(function onServerStarted(resolve) {
      t.serverStartedResolves.push(resolve);
    });
  }

  private static fileProvider: Array<FileProvider> = new Array();

  /**
   * Registers a file provider.
   * @param fileProvider - The file provider to register.
   */
  public static registerFileProvider(fileProvider: FileProvider) {
    HttpServer.fileProvider.push(fileProvider);
  }

  private static imageProvider: Array<ImageProvider> = new Array();

  /**
   * Registers an image provider.
   * @param imageProvider - The image provider to register.
   */
  public static registerImageProvider(imageProvider: ImageProvider) {
    HttpServer.imageProvider.push(imageProvider);
  }

  private static getMethods: Array<HttpMethod> = new Array();

  /**
   * Registers a GET method.
   * @param config - The configuration for the GET method.
   */
  public static registerGet(config: HttpMethod) {
    HttpServer.getMethods.push(config);
  }

  private static postMethods: Array<HttpMethod> = new Array();

  /**
   * Registers a POST method.
   * @param config - The configuration for the POST method.
   */
  public static registerPost(config: HttpMethod) {
    HttpServer.postMethods.push(config);
  }

  private static putMethods: Array<HttpMethod> = new Array();

  /**
   * Registers a PUT method.
   * @param config - The configuration for the PUT method.
   */
  public static registerPut(config: HttpMethod) {
    HttpServer.putMethods.push(config);
  }

  private static deleteMethods: Array<HttpMethod> = new Array();

  /**
   * Registers a DELETE method.
   * @param config - The configuration for the DELETE method.
   */
  public static registerDelete(config: HttpMethod) {
    HttpServer.deleteMethods.push(config);
  }

  /**
   * Gets the WebsocketServer instance associated with the HTTP server.
   * @returns The WebsocketServer instance, or `null` if WebSocket support is not enabled.
   */
  public getWebsocketInstance(): WebsocketServer | null {
    return this.websocket;
  }

  /**
   * Stops the server from accepting new connections and keeps existing connections.
   * This function is asynchronous, and the server is finally closed when all connections are ended
   * and the server emits a `'close'` event.
   * @returns A promise that is resolved once all connections are closed.
   */
  public stop() {
    httpLogger.info("Stopping http server");
    return new Promise<void>(async (resolve, reject) => {
      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
      if (this.supportWebsocket) this.websocket.close();
    }).then();
  }
}
