[![Run Jest Tests](https://github.com/HiptJo/active-connect/actions/workflows/test.yml/badge.svg?branch=master)](https://github.com/HiptJo/active-connect/actions/workflows/test.yml)

# Active-Connect

Connection framework built for smart web-based projects using NodeJS, Angular and Websockets.

This project is developed right now. Stay tuned.

# Decorators

## Annotations

```javascript
@Outbound("libraries")
@SubscribeChanges
function asdf() {

}

@Route("updatelibrary")
@Modifies("libraries")
function update(lib) {

}


for class and function
@StandaloneRoute("xy.xy",baseRoute?)
@Outbound("xy",requireRequesting?: boolean) for function
@Auth(x extends WebsocketAuthenticator)
@SubscribeChanges
@Modifies(method... Array<String>)

@ProvidesFile(label) + ProvidedFile
@ProvidesImage(label) + ProvidedImage
```


# testing
doc: when in testing run, add env flag to avoid exceptions; env: `jest=true`