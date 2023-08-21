export function Outbound(
  method: string,
  lazyLoaded?: boolean,
  cachedOnClient?: boolean,
  sortBy?: (a: any, b: any) => number
) {
  return function _Outbound(target: any, propertyKey: string): any {
    // property annotation
    if (!target.___expectOutboundsCall) {
      target.___expectOutboundsCall = [];
    }
    target.___expectOutboundsCall.push((_this: any) => {
      _this.expectOutbound(method, function setOutbound(data: any) {
        if (data == "data_delete") {
          _this.___data[propertyKey] = undefined;
          _this.loading[propertyKey] = false;
          _this.___received[propertyKey] = false;
          _this.___requested[propertyKey] = false;
        } else {
          if (!_this.___received) _this.___received = {};
          if (!_this.___data) _this.___data = {};
          if (!_this.loading) _this.loading = {};
          if (data && sortBy) data = data.sort(sortBy);
          _this.___received[propertyKey] = true;
          _this.___data[propertyKey] = data;
          _this.loading[propertyKey] = false;
          if (_this.___resolve) {
            if (_this.___resolve[propertyKey]) {
              _this.___resolve[propertyKey].forEach((resolve: Function) =>
                resolve(data)
              );
              _this.___resolve[propertyKey] = [];
            }
          }
        }
      });
    });

    return {
      configurable: true,
      writeable: true,
      get() {
        if (!this.___requested) this.___requested = {};
        if (!this.___requested[propertyKey] && lazyLoaded) {
          this.___requested[propertyKey] = true;
          this.send("request." + method, null).then();
        }
        if (!this.___data) this.___data = {};
        if (!this.loading) this.loading = {};
        if (!this.___data[propertyKey]) {
          this.loading[propertyKey] = true;
        } else if (this.loading[propertyKey]) {
          this.loading[propertyKey] = false;
        }
        if (this.___data[propertyKey]) {
          return this.___data[propertyKey];
        } else {
          return new Promise((resolve) => {
            if (!this.___resolve) this.___resolve = {};
            if (!this.___resolve[propertyKey])
              this.___resolve[propertyKey] = [];
            this.___resolve[propertyKey].push(resolve);
          });
        }
      },
      set(val: any) {
        if (!this.___data) this.___data = {};
        if (!this.loading) this.loading = {};
        this.loading[propertyKey] = false;
        if (val && sortBy) val = val.sort(sortBy);
        return (this.___data[propertyKey] = val);
      },
    };
  };
}
