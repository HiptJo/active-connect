import {
  LazyLoading,
  Modifies,
  Outbound,
  Route,
  Subscribe,
} from "../../../src";
import {
  WebsocketClient,
  Route as ClientRoute,
  Outbound as ClientOutbound,
  TCWrapper,
  LoadingStatus,
} from "../../../src/integration-testing";

class Pool extends LoadingStatus {
  @ClientOutbound("int.data") public data: Promise<string[]>;
  @ClientOutbound("int.request", true) public requestable: Promise<number>;

  constructor() {
    super(Pool.prototype as any);
  }
}
class Service {
  constructor(private client: WebsocketClient) {
    expect(this.client).toBeDefined();
  }

  @ClientRoute("int.update")
  async update(value: any): Promise<any> {}
}
class TC extends TCWrapper {
  public pool: Pool;
  public service: Service;
  constructor() {
    super(new Pool());
    this.pool = this.client as Pool;
    this.service = new Service(this.client);
  }
}

@Route("int")
class Server {
  private data: string[] = ["1", "2"];

  @Route("update")
  @Modifies("int.data")
  update(data: any) {
    this.data = data;
  }

  @Outbound("int.data")
  @Subscribe
  send() {
    return this.data;
  }

  @Outbound("int.request")
  @LazyLoading
  requestedData() {
    return -1;
  }
}

it("should be possible to use the integration testing module", async () => {
  expect(Server).toBeDefined();
  const conn = new TC();
  expect(await conn.pool.data).toStrictEqual(["1", "2"]);
  const data: string[] = Array.from(await conn.pool.data);
  data.push("new");
  expect(conn.pool.data).toHaveLength(2);
  await conn.service.update(data);
  expect(conn.pool.data).toStrictEqual(["1", "2", "new"]);
  expect(conn.pool.isLoading()).toBeFalsy();
});
it("should not send requestable outbound without requesting it", async () => {
  const conn = new TC();
  conn.dontExpectMethod("int.request");
});
it("should send requestable outbound after requesting it", async () => {
  const conn = new TC();
  expect(await conn.pool.requestable).toBe(-1);
});
it("should be possible to access loading status data", () => {
  const conn = new TC();
  expect(conn.pool.isLoading()).toBeFalsy();
  expect(conn.pool.isLoading("entry")).toBeFalsy();
  expect(conn.pool.getCurrent()).toBe(0);

  conn.pool.loading.set("propertyKey", true);
  expect(conn.pool.getCurrent()).toBe(1);
});
