# Active-Connect

Connection framework built for smart web-based projects using NodeJS, Angular and Websockets.

This project is developed right now. Stay tuned.

# Decorators

## Annotations

```javascript
@Route("xy") for class and function
@Outbound("xy",requireRequesting?: boolean) for function
@StandaloneRoute("xy.xy")
@StandaloneOutbound("xy.xy")
@Authenticate(Authenticator)
@SubscribeChanges
@SendUpdates(method... Array<String>)
@ProvidesFile(label)
@ProvidesImage(label)
```
