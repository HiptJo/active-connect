import {
  LazyLoading,
  Modifies,
  Outbound,
  PartialOutboundData,
  PartialOutboundDataForGroup,
  PartialUpdates,
  Route,
  Subscribe,
  SupportsCache,
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

class Pool extends LoadingStatus {
  @ClientOutbound("int.data") public data: Promise<string[]>;
  @ClientOutbound("int.request", true) public requestable: Promise<number>;

  public large = new OutboundObject<Data>(this, "int.large", true, false, 10);

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
  }

  @Route("init")
  @Modifies("int.large")
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
      return new PartialOutboundData(
        this.large.filter((l) => l.id == id),
        this.large.length
      );
    }
    return new PartialOutboundData(
      this.large.slice(0, count),
      this.large.length
    );
  }

  @Outbound("int.request")
  @LazyLoading
  requestedData() {
    return -1;
  }
}

beforeEach(async () => {
  const conn = new TC();
  conn.service.reset();
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

  const obj90 = await conn.pool.large.get(90);
  expect(obj90).toMatchObject({ id: 90, name: "d90" });
  expect(conn.pool.large.loadedLength).toBe(22);
});
it("should be possible to get grouped data", async () => {
  const conn = new TC();
  await conn.service.init();
  const data = await conn.pool.large.getForGroup(10);
  expect(data).toHaveLength(10);
  data.forEach((d) => expect(d.id % 10).toBe(0));
});

it("should be possible to get subscribe for grouped data and get updates when data is changed", async () => {
  const conn = new TC();
  await conn.service.init();
  let data = await conn.pool.large.getForGroup(10);
  expect(data).toHaveLength(10);
  data.forEach((d) => expect(d.id % 10).toBe(0));

  await conn.service.init();
  data = await conn.pool.large.getForGroup(10);
  expect(data).toHaveLength(20);
  data.forEach((d) => expect(d.id % 10).toBe(0));
});
