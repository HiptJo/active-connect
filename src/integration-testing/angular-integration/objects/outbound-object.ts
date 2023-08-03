import { WebsocketClient } from "../client/client";

export interface IdObject {
  id: number;
}

export class OutboundObject<T extends IdObject> {
  constructor(
    private client: WebsocketClient,
    private method: string,
    private lazyLoaded?: boolean,
    public readonly cached?: boolean,
    private initialLoadingCount?: number
  ) {
    this.target.loading = new Map<string, boolean>();
    if (!this.target.___expectOutboundsCall) {
      this.target.___expectOutboundsCall = [];
    }
    const _this = this;
    client.expectOutbound(
      method,
      function setOutbound(
        data: any,
        specificHash: number | null,
        insertedOrGroupData: any[] | null,
        updatedOrGroupId: any[] | null,
        deleted: any[] | null,
        length: number | null,
        _client: WebsocketClient
      ) {
        if (data == "data_delete") {
          _this.data = undefined;
          _this.dataMap = new Map();
          _this.requested = false;
          _this.loadedGroupData = null;
          _this.loadedGroupId = null;
          _this._length = null;
        } else if (data == "data_group") {
          _this.loadedGroupData = insertedOrGroupData;
          _this.loadedGroupId = updatedOrGroupId[0];
        } else if (data == "data_diff") {
          insertedOrGroupData?.forEach((e) => {
            _this.dataMap.set(e.id, e);
          });
          updatedOrGroupId?.forEach((e) => {
            _this.dataMap.set(e.id, e);
          });
          deleted?.forEach((e) => {
            _this.dataMap.delete(e.id);
          });
          _this.data = Array.from(_this.dataMap.values());
          _this._loading = false;
        } else {
          _this.setData(data);
          _this._loading = false;
        }
        if (length) _this._length = length;
      }
    );
  }

  get target(): any {
    return (this.client as any).__proto__;
  }

  private dataMap: Map<number, T> = new Map();
  private data: T[] | undefined = undefined;

  public get(id: number): Promise<T> {
    return new Promise(async (resolve) => {
      if (!this.requested && this.lazyLoaded) {
        await this.load();
      }
      if (this.data) {
        const result = this.dataMap.get(id);
        if (result) {
          resolve(result);
        } else if (this.lazyLoaded) {
          await this.requestById(id);
          resolve(await this.get(id));
        } else {
          resolve(undefined as any);
        }
      } else {
        resolve(undefined as any);
      }
    });
  }

  public getForGroup(groupId: number): Promise<T[]> {
    return new Promise(async (resolve) => {
      if (!this.requested && this.lazyLoaded) {
        await this.load();
      }
      if (this.loadedGroupId == groupId) {
        resolve(this.loadedGroupData);
      } else {
        await this.requestForGroup(groupId);
        resolve(await this.getForGroup(groupId));
      }
    });
  }

  public get all(): T[] | null {
    if (!this.requested && this.lazyLoaded) {
      this.load().then();
    }
    return this.data;
  }

  private requested: boolean = false;
  public async load(count?: number): Promise<void> {
    if (this.lazyLoaded) {
      this.requested = true;
      this._loading = true;
      await this.client.send("request." + this.method, {
        count: this.loadedLength + (count || this.initialLoadingCount),
      });
      this._loading = false;
    } else {
      throw Error(
        "Active-Connect: Cannot run loading request as this outbound is not lazy-loaded."
      );
    }
  }

  private _loading = false;
  public get loading(): boolean {
    return this._loading;
  }
  public get loadedLength(): number {
    return this.data?.length || 0;
  }
  private _length: number | undefined = undefined;
  public get length(): number | undefined {
    return this._length;
  }

  get isEmpty() {
    return this.data == undefined;
  }

  private requestById(id: number): Promise<T> {
    return this.client.send("request." + this.method, { id }) as Promise<T>;
  }

  private loadedGroupId: number | null = null;
  private loadedGroupData: T[] | null = null;
  private requestForGroup(groupId: number): Promise<T[]> {
    return this.client.send("request." + this.method, { groupId });
  }

  private setData(data: T[]) {
    this.data = data as T[];
    this._length = data.length;
    this.dataMap = new Map();
    this.data.forEach((d) => {
      this.dataMap.set(d.id, d);
    });
  }
}
