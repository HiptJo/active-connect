import { StubWebsocketConnection } from "../../connections/tc";

export interface IdObject {
  id: number;
}

export class OutboundObject<T extends IdObject> {
  constructor(
    private client: StubWebsocketConnection,
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
    this.target.___expectOutboundsCall.push((_client: any) => {
      _client.expectOutbound(
        method,
        function setOutbound(
          data: any,
          specificHash: number | null,
          inserted: any[] | null,
          updated: any[] | null,
          deleted: any[] | null,
          _client: StubWebsocketConnection
        ) {
          if (data == "data_diff") {
            inserted?.forEach((e) => {
              _this.dataMap.set(e.id, e);
            });
            updated?.forEach((e) => {
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
        }
      );
    });
  }

  get target(): any {
    return (this.client as any).prototype;
  }

  private dataMap: Map<number, T> = new Map();
  private data: T[] | null = null;

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

  public get all(): T[] | null {
    return this.data;
  }

  private requested: boolean = false;
  public async load(count?: number): Promise<void> {
    if (this.lazyLoaded) {
      this.requested = true;
      this._loading = true;
      this.client.send("request." + this.method, {
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

  private requestById(id: number): Promise<T> {
    return this.client.send("request." + this.method, { id }) as Promise<T>;
  }

  private setData(data: T[] | { added: T[] | undefined; length: number }) {
    if ((data as any).added) {
      if (!this.data) {
        this.data = [];
      }
      this.data.push(...(data as any).added);
      this._length = data.length;
      this.data.forEach((d) => {
        this.dataMap.set(d.id, d);
      });
    } else {
      this.data = data as T[];
      this._length = data.length;
      this.dataMap = new Map();
      this.data.forEach((d) => {
        this.dataMap.set(d.id, d);
      });
    }
  }
}
