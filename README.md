# Active-Connect

Connection framework built for smart web-based projects using NodeJS, Angular and Websockets.

This project is developed right now. Stay tuned.

# Decorators

## Annotations

```javascript
@Route("xy",baseRoute?) for class and function
@StandaloneRoute("xy.xy",baseRoute?)
@Outbound("xy",requireRequesting?: boolean) for function
@Auth(x extends WebsocketAuthenticator)

@SubscribeChanges
@Modifies(method... Array<String>)

@ProvidesFile(label) + ProvidedFile
@ProvidesImage(label) + ProvidedImage
```
