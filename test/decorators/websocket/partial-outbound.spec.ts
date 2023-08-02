import {
  Outbound,
  Subscribe,
  StandaloneRoute,
  Modifies,
  PartialUpdates,
  SupportsCache,
} from "../../../src";
import { WebsocketMocks } from "../../server/websocket-mocks";

class Data {
  public static AUTO_INCREMENT = 0;
  public id: number;
  constructor(public name: string) {
    this.id = ++Data.AUTO_INCREMENT;
  }
}

describe("eager-loaded outbound", () => {
  class Testing {
    public static data: Data[] = [];

    @Outbound("out.partial1")
    @PartialUpdates
    @Subscribe
    async getData() {
      return JSON.parse(JSON.stringify(Testing.data));
    }

    @StandaloneRoute("partial1.add")
    @Modifies("out.partial1")
    add(value: Data) {
      Testing.data.push(value);
    }

    @StandaloneRoute("partial1.update")
    @Modifies("out.partial1")
    update(value: Data) {
      Testing.data.filter((d) => d.id == value.id)[0].name = value.name;
    }

    @StandaloneRoute("partial1.delete")
    @Modifies("out.partial1")
    delete(value: Data) {
      Testing.data = Testing.data.filter((d) => d.id != value.id);
    }

    @StandaloneRoute("partial1.shuffle")
    @Modifies("out.partial1")
    shuffle() {
      Testing.data = Testing.data.sort(() => Math.random() - 0.5);
    }
  }

  it("should be possible to access data as client with cache support", async () => {
    expect(Testing).toBeDefined();
    expect(Testing.data).toHaveLength(0);
    const conn = WebsocketMocks.getConnectionStub(true);
    const data = await conn.expectMethod("out.partial1", 1000000);
    expect(data).toHaveLength(0);
    const data1 = new Data("new");
    conn.runRequest("partial1.add", data1);
    expect(
      await conn.expectMethod(
        "out.partial1",
        1000000,
        (specificHash, inserted, updated, deleted) => {
          expect(updated).toStrictEqual([]);
          expect(deleted).toStrictEqual([]);
          expect(inserted).toEqual([data1]);
        }
      )
    ).toBe("data_diff");

    data1.name = "updated";
    expect(Testing.data).not.toBe([data1]);

    conn.runRequest("partial1.update", data1);
    expect(
      await conn.expectMethod(
        "out.partial1",
        1000000,
        (specificHash, inserted, updated, deleted) => {
          expect(inserted).toStrictEqual([]);
          expect(deleted).toStrictEqual([]);
          expect(updated).toEqual([data1]);
        }
      )
    ).toBe("data_diff");

    const data2 = new Data("new1");
    conn.runRequest("partial1.add", data2);
    expect(
      await conn.expectMethod(
        "out.partial1",
        1000000,
        (specificHash, inserted, updated, deleted) => {
          expect(updated).toStrictEqual([]);
          expect(deleted).toStrictEqual([]);
          expect(inserted).toEqual([data2]);
        }
      )
    ).toBe("data_diff");

    conn.runRequest("partial1.delete", data2);
    expect(
      await conn.expectMethod(
        "out.partial1",
        1000000,
        (specificHash, inserted, updated, deleted) => {
          expect(updated).toStrictEqual([]);
          expect(inserted).toStrictEqual([]);
          expect(deleted).toEqual([data2]);
        }
      )
    ).toBe("data_diff");

    for (var i = 0; i < 20; i++) {
      const data3 = new Data("auto_" + i);
      conn.runRequest("partial1.add", data3);
      expect(
        await conn.expectMethod(
          "out.partial1",
          1000000,
          (specificHash, inserted, updated, deleted) => {
            expect(updated).toStrictEqual([]);
            expect(deleted).toStrictEqual([]);
            expect(inserted).toEqual([data3]);
          }
        )
      ).toBe("data_diff");
    }

    conn.runRequest("partial1.shuffle", null);
    expect(
      await conn.expectMethod(
        "out.partial1",
        1000000,
        (specificHash, inserted, updated, deleted) => {
          expect(updated).toStrictEqual([]);
          expect(inserted).toStrictEqual([]);
          expect(deleted).toStrictEqual([]);
        }
      )
    ).toBe("data_diff");
  });
});

describe("should send updated entries only when the client restores the cached value on connect", () => {
  class Testing {
    public static data: Data[] = [new Data("test1"), new Data("test2")];

    @Outbound("out.partial2")
    @PartialUpdates
    @SupportsCache
    @Subscribe
    async getData() {
      return JSON.parse(JSON.stringify(Testing.data));
    }

    @StandaloneRoute("partial2.add")
    @Modifies("out.partial2")
    add(value: Data) {
      Testing.data.push(value);
    }
  }

  it("should be possible to access data as client with cache support", async () => {
    expect(Testing).toBeDefined();
    expect(Testing.data).toHaveLength(2);

    // fetch initial hash value
    const conn = WebsocketMocks.getConnectionStub(true);
    var hash = 0;
    await conn.expectCacheRequest("out.partial2");
    conn.runRequest("___cache", {
      method: "out.partial2",
      specificHash: null,
    });
    const data = await conn.expectMethod("out.partial2", 1000000, (h) => {
      hash = h;
    });
    expect(data).toHaveLength(2);
    expect(hash).not.toBe(0);

    const newConn = WebsocketMocks.getConnectionStub(true);
    await newConn.expectCacheRequest("out.partial2");
    newConn.runRequest("___cache", {
      method: "out.partial2",
      specificHash: hash,
    });
    const command = await newConn.expectMethod("out.partial2");
    expect(command).toBe("cache_restore");

    const data1 = new Data("new");
    newConn.runRequest("partial2.add", data1);
    expect(
      await newConn.expectMethod(
        "out.partial2",
        1000000,
        (specificHash, inserted, updated, deleted) => {
          expect(specificHash).toBeDefined();
          expect(specificHash).not.toBe(hash);
          expect(updated).toStrictEqual([]);
          expect(deleted).toStrictEqual([]);
          expect(inserted).toEqual([data1]);
        }
      )
    ).toBe("data_diff");
  });
});
