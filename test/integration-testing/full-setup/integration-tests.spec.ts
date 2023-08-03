import {
  Auth,
  ForGroup,
  ForId,
  LazyLoading,
  Modifies,
  ModifiesAuthentication,
  Outbound,
  PartialOutboundData,
  PartialOutboundDataForGroup,
  PartialOutboundDataForId,
  PartialUpdates,
  ResendAfterAuthenticationChange,
  Route,
  StandaloneRoute,
  Subscribe,
  SupportsCache,
  WebsocketAuthenticator,
  WebsocketConnection,
} from "../../../src";
import {
  WebsocketClient,
  Route as ClientRoute,
  Outbound as ClientOutbound,
  TCWrapper,
  LoadingStatus,
} from "../../../src/integration-testing";
import { OutboundObject } from "../../../src/integration-testing/angular-integration/objects/outbound-object";

class Data {
  public static AUTO_INCREMENT = 0;
  public id: number;
  constructor(public name: string) {
    this.id = ++Data.AUTO_INCREMENT;
  }
}

class TokenAuthenticator extends WebsocketAuthenticator {
  public readonly label: string = "test-auth";
  public unauthenticatedMessage: string = "error message";
  public async authenticate(conn: WebsocketConnection): Promise<boolean> {
    return conn.token == "true";
  }
}

class Pool extends LoadingStatus {
  @ClientOutbound("int.data") public data: Promise<string[]>;
  @ClientOutbound("int.request", true) public requestable: Promise<number>;

  public large = new OutboundObject<Data>(this, "int.large", true, false, 10);
  public authChangedData = new OutboundObject<Data>(
    this,
    "d.partloaded.1",
    true,
    false,
    10
  );
  public largeWithDecorators = new OutboundObject<Data>(
    this,
    "int.largewithdecorators",
    true,
    false,
    10
  );

  constructor() {
    super(Pool.prototype as any);
  }
}
class Service {
  private value = 1;

  constructor(private client: WebsocketClient) {
    expect(this.client).toBeDefined();
  }

  @ClientRoute("int.update")
  async update(value: any): Promise<any> {
    expect(this.value).toBe(1);
  }

  @ClientRoute("int.init")
  async init(): Promise<any> {}

  @ClientRoute("int.reset")
  async reset(): Promise<any> {}

  @ClientRoute("partloaded.token")
  async auth(token: string): Promise<any> {}
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
  private large: Data[] = [];

  @Route("update")
  @Modifies("int.data")
  update(data: any) {
    this.data = data;
  }

  @Route("reset")
  reset() {
    this.large = [];
    Data.AUTO_INCREMENT = 0;
  }

  @Route("init")
  @Modifies("int.large", "int.largewithdecorators")
  init() {
    for (var i = 1; i <= 100; i++) {
      this.large.push(new Data("d" + i));
    }
  }

  @Outbound("int.data")
  @Subscribe
  send() {
    return this.data;
  }

  @Outbound("int.large")
  @Subscribe
  @PartialUpdates
  @LazyLoading
  @SupportsCache
  sendLarge(
    conn: any,
    count: number,
    id: number | null,
    groupId: number | null
  ) {
    if (groupId) {
      const data = this.large.filter((l) => l.id % groupId == 0);
      return new PartialOutboundDataForGroup(data);
    }
    if (id) {
      return new PartialOutboundDataForId(
        this.large.filter((l) => l.id == id)[0]
      );
    }
    return new PartialOutboundData(
      this.large.slice(0, count),
      this.large.length
    );
  }

  @Outbound("int.largewithdecorators")
  @Subscribe
  @PartialUpdates
  @LazyLoading
  @SupportsCache
  sendLargeData(conn: any, count: number) {
    return new PartialOutboundData(
      this.large.slice(0, count),
      this.large.length
    );
  }

  @ForId("int.largewithdecorators")
  sendLargeDataForId(conn: any, id: number) {
    return new PartialOutboundDataForId(
      this.large.filter((l) => l.id == id)[0]
    );
  }

  @ForGroup("int.largewithdecorators")
  sendLargeDataForGroup(conn: any, groupId: number) {
    const data = this.large.filter((l) => l.id % groupId == 0);
    return new PartialOutboundDataForGroup(data);
  }

  @Outbound("int.request")
  @LazyLoading
  requestedData() {
    return -1;
  }

  @Outbound("d.partloaded.1")
  @Auth(new TokenAuthenticator())
  @ResendAfterAuthenticationChange
  @LazyLoading
  async getData() {
    return [{ id: 0, name: "data" }];
  }

  @StandaloneRoute("partloaded.token")
  @ModifiesAuthentication
  setToken(token: string, conn: WebsocketConnection) {
    conn.token = token;
  }
}

beforeEach(async () => {
  const conn = new TC();
  await conn.service.reset();
});

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
describe("outbound object without splitted decorators", () => {
  it("should be possible to use the outbound-object", async () => {
    const conn = new TC();
    expect(conn.pool.large.loading).toBeFalsy();
    expect(conn.pool.large.loadedLength).toBe(0);

    await conn.service.init();

    await conn.pool.large.load();
    expect(conn.pool.large.loadedLength).toBe(10);
    expect(conn.pool.large.length).toBe(100);
    expect(conn.pool.large.all).toHaveLength(10);

    await conn.pool.large.load();
    expect(conn.pool.large.loadedLength).toBe(20);
    expect(conn.pool.large.all).toHaveLength(20);

    await conn.pool.large.load(1);
    expect(conn.pool.large.loadedLength).toBe(21);
    expect(conn.pool.large.all).toHaveLength(21);
  });
  it("should be possible to get data by id", async () => {
    const conn = new TC();
    await conn.service.init();
    const obj90 = await conn.pool.large.get(90);
    expect(obj90).toMatchObject({ id: 90, name: "d90" });
  });
  it("should be possible to get grouped data", async () => {
    const conn = new TC();
    await conn.service.init();
    const data = await conn.pool.large.getForGroup(10);
    expect(data).toHaveLength(10);
    data.forEach((d) => expect(d.id % 10).toBe(0));
  });

  it("should be possible to get subscribe for grouped data and get updates when data is changed *_**", async () => {
    const conn = new TC();
    await conn.service.init();
    let data = await conn.pool.large.getForGroup(10);
    expect(data).toHaveLength(10);
    data.forEach((d) => expect(d.id % 10).toBe(0));

    conn.service.init().then();
    data = await conn.pool.large.awaitGroupDataUpdate();
    expect(data).toHaveLength(20);
    data.forEach((d) => expect(d.id % 10).toBe(0));
  });
});

describe("outbound object using splitted decorators", () => {
  it("should be possible to use the outbound-object", async () => {
    jest.setTimeout(30000);
    const conn = new TC();
    expect(conn.pool.largeWithDecorators.loading).toBeFalsy();
    expect(conn.pool.largeWithDecorators.loadedLength).toBe(0);

    await conn.service.init();

    await conn.pool.largeWithDecorators.load();
    expect(conn.pool.largeWithDecorators.loadedLength).toBe(10);
    expect(conn.pool.largeWithDecorators.length).toBe(100);
    expect(conn.pool.largeWithDecorators.all).toHaveLength(10);

    await conn.pool.largeWithDecorators.load();
    expect(conn.pool.largeWithDecorators.loadedLength).toBe(20);
    expect(conn.pool.largeWithDecorators.all).toHaveLength(20);

    await conn.pool.largeWithDecorators.load(1);
    expect(conn.pool.largeWithDecorators.loadedLength).toBe(21);
    expect(conn.pool.largeWithDecorators.all).toHaveLength(21);
  });
  it("should be possible to get data by id", async () => {
    const conn = new TC();
    await conn.service.init();
    const obj90 = await conn.pool.largeWithDecorators.get(90);
    expect(obj90).toMatchObject({ id: 90, name: "d90" });
    expect(conn.pool.largeWithDecorators.isEmpty).toBeTruthy();
  });
  it("should be possible to get grouped data", async () => {
    const conn = new TC();
    await conn.service.init();
    const data = await conn.pool.largeWithDecorators.getForGroup(10);
    expect(data).toHaveLength(10);
    data.forEach((d) => expect(d.id % 10).toBe(0));
  });

  it("should be possible to get subscribe for grouped data and get updates when data is changed ***", async () => {
    const conn = new TC();
    await conn.service.init();
    let data = await conn.pool.largeWithDecorators.getForGroup(10);
    expect(data).toHaveLength(10);
    data.forEach((d) => expect(d.id % 10).toBe(0));

    await conn.service.init();
    data = await conn.pool.largeWithDecorators.getForGroup(10);
    expect(data).toHaveLength(20);
    data.forEach((d) => expect(d.id % 10).toBe(0));
  });
});

it("should delete outbound data after an auth change when the client is not longer authenticated for the outbound", async () => {
  const conn = new TC();

  await conn.service.auth("true");

  await conn.pool.authChangedData.load();
  expect(conn.pool.authChangedData.all).toHaveLength(1);
  expect(conn.pool.authChangedData.isEmpty).toBeFalsy();

  await conn.service.auth("false");
  await conn.expectMethod("d.partloaded.1");

  expect(conn.pool.authChangedData.isEmpty).toBeTruthy();
  expect(conn.pool.authChangedData.all).toBeUndefined();
  // error is expected as loading is triggered - and auth fails for loading procedure
  await conn.expectError();
});
