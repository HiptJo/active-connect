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
          if (_this.groupDataUpdate) {
            _this.groupDataUpdate(_this.loadedGroupData);
            _this.groupDataUpdate = null;
          }
        } else if (data == "data_id") {
          _this.loadedIdData =
            insertedOrGroupData?.length > 0 ? insertedOrGroupData[0] : null;
          _this.loadedId = updatedOrGroupId[0];
          if (_this.idDataUpdate) {
            _this.idDataUpdate(_this.loadedIdData);
            _this.idDataUpdate = null;
          }
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

  private idDataUpdate: Function = null;
  public awaitIdDataUpdate(): Promise<T> {
    return new Promise((resolve) => {
      this.idDataUpdate = resolve;
    });
  }
  public get(id: number): Promise<T> {
    return new Promise(async (resolve) => {
      if (this.data) {
        const result = this.dataMap.get(id);
        if (result) {
          resolve(result);
          return;
        }
      } else {
        // load request is required to establish subscriptions
        this.load().then();
      }
      if (this.loadedId == id) {
        resolve(this.loadedIdData);
      } else {
        this.requestForId(id).then();
        resolve(await this.awaitIdDataUpdate());
      }
    });
  }

  private groupDataUpdate: Function = null;
  public awaitGroupDataUpdate(): Promise<T[]> {
    return new Promise((resolve) => {
      this.groupDataUpdate = resolve;
    });
  }
  public getForGroup(groupId: number): Promise<T[]> {
    return new Promise(async (resolve) => {
      // load request is required to establish subscriptions
      if (!this.requested) this.load().then();

      if (this.loadedGroupId == groupId) {
        resolve(this.loadedGroupData);
      } else {
        this.requestForGroup(groupId).then();
        resolve(await this.awaitGroupDataUpdate());
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

  private loadedId: number | null = null;
  private loadedIdData: T | null = null;
  private requestForId(id: number): Promise<T> {
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

  /**
   * The contained data can be modified within the callback method
   */
  public update(callback: (data: T[]) => void) {
    if (this.data) {
      const updateLengthVariable = this.data.length == this._length;
      const length = this.length;
      callback(this.data);
      this.setData(this.data);
      if (!updateLengthVariable) {
        this._length = length;
      }
    }
  }
}
