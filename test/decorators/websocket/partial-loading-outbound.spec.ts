import {
  LazyLoading,
  Modifies,
  Outbound,
  PartialOutboundData,
  PartialOutboundDataForId,
  PartialUpdates,
  StandaloneRoute,
  Subscribe,
  SupportsCache,
  WebsocketConnection,
} from "../../../src";
import { IdObject } from "../../../src/integration-testing/angular-integration/objects/outbound-object";
import { WebsocketMocks } from "../../server/websocket-mocks";

class Data implements IdObject {
  public static AUTO_INCREMENT = 0;
  public id: number;
  constructor(public name: string) {
    this.id = ++Data.AUTO_INCREMENT;
  }

  static generate(): Data[] {
    const arr: Data[] = [];
    for (var i = 1; i <= 100; i++) {
      arr.push(new Data("obj" + i));
    }
    return arr;
  }
}

class Testing {
  public static data: Data[] = Data.generate();

  @Outbound("d.partloaded")
  @SupportsCache
  @PartialUpdates
  @LazyLoading
  @Subscribe
  async getData(conn: WebsocketConnection, count: number, id: number) {
    if (id) {
      return new PartialOutboundDataForId(
        Testing.data.filter((d) => d.id == id)[0]
      );
    }
    if (count) {
      return new PartialOutboundData(
        Testing.data.slice(0, count),
        Testing.data.length
      );
    }
    return Testing.data;
  }

  @StandaloneRoute("partloaded.add")
  @Modifies("d.partloaded")
  async add(data: Data) {
    Testing.data = [data].concat(...Testing.data);
  }
}

beforeEach(() => {
  Data.AUTO_INCREMENT = 0;
  Testing.data = Data.generate();
});

describe("partial loaded data (lazy-loaded, without cache support)", () => {
  it("should be possible to access data using an regular request (without length)", async () => {
    expect(Testing).toBeDefined();
    const conn = WebsocketMocks.getConnectionStub();
    conn.runRequest("request.d.partloaded", null);
    const data = await conn.expectMethod("d.partloaded");
    expect(data.length).toBeGreaterThan(99);
  });
  it("should be possible to partially load data", async () => {
    const conn = WebsocketMocks.getConnectionStub();
    conn.runRequest("request.d.partloaded", {
      count: 10,
    });
    const data = await conn.expectMethod("d.partloaded");
    expect(data).toHaveLength(10);

    conn.runRequest("request.d.partloaded", {
      count: 20,
    });
    const data1 = await conn.expectMethod(
      "d.partloaded",
      undefined,
      undefined,
      (h, ins, upd, del) => {
        expect(ins).toHaveLength(10);
      }
    );
    expect(data1).toBe("data_diff");
  });
  it("should be possible to access entry by id", async () => {
    const conn = WebsocketMocks.getConnectionStub();
    conn.runRequest("request.d.partloaded", {
      id: 25,
    });
    const data = await conn.expectMethod(
      "d.partloaded",
      undefined,
      undefined,
      (s, inserted) => {
        expect(inserted).toHaveLength(1);
        expect(inserted[0]).toMatchObject({
          id: 25,
          name: "obj25",
        });
      }
    );
    expect(data).toBe("data_id");
  });
  it("should be possible to get changes", async () => {
    const conn = WebsocketMocks.getConnectionStub();
    conn.runRequest("request.d.partloaded", {
      count: 10,
    });
    const data = await conn.expectMethod("d.partloaded");
    expect(data).toHaveLength(10);

    conn.runRequest("partloaded.add", new Data("updated"));
    const updated = await conn.expectMethod(
      "d.partloaded",
      null,
      null,
      (hash, ins, upd, del) => {
        expect(ins).toHaveLength(1);
        expect(ins[0]).toMatchObject({ name: "updated" });
      }
    );
    expect(updated).toBe("data_diff");
  });
});

describe("partial loaded data (lazy-loaded, with cache support)", () => {
  it("should be possible to access data using an regular request (without length)", async () => {
    expect(Testing).toBeDefined();
    const conn = WebsocketMocks.getConnectionStub(true);
    conn.runRequest("request.d.partloaded", null);
    await conn.expectCacheRequest("d.partloaded");
    conn.runRequest("___cache", {
      method: "d.partloaded",
      globalHash: null,
      specificHash: null,
    });
    const data = await conn.expectMethod("d.partloaded");
    expect(data.length).toBeGreaterThan(99);
  });
  it("should be possible to partially load data", async () => {
    let specific = 0;
    const conn = WebsocketMocks.getConnectionStub(true);
    conn.runRequest("request.d.partloaded", {
      count: 10,
    });
    await conn.expectCacheRequest("d.partloaded");
    conn.runRequest("___cache", {
      method: "d.partloaded",
      globalHash: null,
      specificHash: null,
    });
    const data = await conn.expectMethod(
      "d.partloaded",
      undefined,
      undefined,
      (s: number) => {
        specific = s;
      }
    );
    expect(data).toHaveLength(10);

    conn.runRequest("request.d.partloaded", {
      count: 20,
    });
    await conn.expectCacheRequest("d.partloaded");
    conn.runRequest("___cache", {
      method: "d.partloaded",
      specificHash: specific,
    });
    const data1 = await conn.expectMethod(
      "d.partloaded",
      undefined,
      undefined,
      (s, inserted, updated, deleted) => {
        expect(inserted).toHaveLength(10);
      }
    );
    expect(data1).toBe("data_diff");
  });
  it("should be possible to access entry by id", async () => {
    const conn = WebsocketMocks.getConnectionStub(true);
    conn.runRequest("request.d.partloaded", {
      id: 25,
    });
    const data = await conn.expectMethod(
      "d.partloaded",
      undefined,
      undefined,
      (s, inserted) => {
        expect(inserted).toHaveLength(1);
        expect(inserted).toMatchObject([
          {
            id: 25,
            name: "obj25",
          },
        ]);
      }
    );
    expect(data).toBe("data_id");
  });
  it("should be possible to get changes", async () => {
    const conn = WebsocketMocks.getConnectionStub(true);
    conn.runRequest("request.d.partloaded", {
      count: 10,
    });
    await conn.expectCacheRequest("d.partloaded");
    conn.runRequest("___cache", {
      method: "d.partloaded",
      globalHash: null,
      specificHash: null,
    });
    const data = await conn.expectMethod("d.partloaded");
    expect(data).toHaveLength(10);

    conn.runRequest("partloaded.add", new Data("updated"));
    const updated = await conn.expectMethod(
      "d.partloaded",
      undefined,
      undefined,
      (s, inserted, updated, deleted) => {
        expect(inserted).toHaveLength(1);
        expect(inserted[0]).toMatchObject({ name: "updated" });
      }
    );
    expect(updated).toBe("data_diff");
  });
});
