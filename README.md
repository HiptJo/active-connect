# Active-Connect

[![Run Jest Tests](https://github.com/HiptJo/active-connect-ng/actions/workflows/test.yml/badge.svg?branch=master)](https://github.com/HiptJo/active-connect-ng/actions/workflows/test.yml)

Active-Connect is a powerful connection framework designed for smart web-based projects using Node.js, Angular, and WebSockets. It provides decorators and utilities to simplify the integration of Angular with a WebSocket server, making it easier to handle real-time communication between clients and the server.

## Features

- Create a service that allows active connections with clients via HTTP and WebSockets.
- Utilize decorators to define WebSocket routes, authentication, filters, and outbound methods.
- Built-in support for authenticators to check client permissions for performing actions.
- Filters to associate connections and data with subscription groups, enabling efficient updates to clients.
- Send data to clients effortlessly using the `@Outbound(...)` decorator.
- Facilitates easy unit and integration testing of WebSocket functionalities.

## Example

```typescript
@Route("user")
class UserManagementWebsocketService {
    @Auth(new UserLoggedInAuthenticator())
    @Route("save")
    async save(user: User, connection: WebsocketConnection): Promise<any> {
        // update user data
        return true; // return value (true) is sent back to the client.
    }
}
```

## Authenticators

Authenticators are used to verify whether a client has sufficient permissions to perform a specific action. They can be applied to routes, outbounds, or when serving files/images. For example, the `@Auth` decorator in the provided example is used to enforce authentication for the `user.save` route.

## Filters

Filters are used to associate connections and data with subscription groups. They facilitate efficient data updates by sending data only to clients matching the filter when the associated data changes. Filters are not used for data validation, but rather for efficient data distribution.

## Outbounds

The `@Outbound(...)` decorator enables easy sending of data to clients. Outbounds automatically handle updates and send them to subscribing clients whenever a subscription is created.

### Example

```typescript
class ArticleManagementWebsocketService {
    @Auth(new UserLoggedInAuthenticator())
    @Outbound("data.articles")
    async save(connection: WebsocketConnection): Promise<Article[]> {
        return await Articles.getAll();
    }
}
```

## Usage

Active-Connect is designed for the entire communication process, but this package contains the server-side implementation. To connect an Angular application with an Active-Connect server, developers can use the `active-connect-ng2` framework available via npm.

## Contributions

Contributions to Active-Connect are welcome! If you have any suggestions, bug fixes, or feature implementations, please feel free to fork the repository, make your changes, and submit a pull request.

## Known Limitations

At present, Active-Connect requires the transmission of relatively large amounts of data between the server and clients. To address this, caching mechanisms and partial outbound updates are planned for future releases to optimize data transmission.

## Documentation

Comprehensive documentation for Active-Connect can be found at [activeconnect.hiptmairit.at](https://activeconnect.hiptmairit.at). The documentation is split into different sections:

- `http`: Contains details concerning HTTP connections, such as registering GET methods, etc.
- `websocket`: Contains details about WebSocket connections, including route definitions and usage.
- `content`: Contains details on serving images and other content.
- `integration-testing`: Provides information about the integration testing process, primarily built for Jest, but other frameworks should work as well.
- `jest`: Contains some Jest-specific methods to improve the process of creating tests.

**Note**: Decorators are generally found in the "Functions" section of each group.

## Use Cases

Active-Connect is an ideal solution for any application where data changes frequently and requires real-time updates. Its WebSocket-based communication provides a quick way to implement API requests, reducing the need for frequent polling and improving efficiency.

## Scalability

Active-Connect is currently designed to operate in a single container, and its decorator route configurations limit the service to hosting a single HTTP and WebSocket service on one port at a time. Scalability options are being considered for future development.

## License

Active-Connect is open-source software licensed under the [MIT License](https://github.com/HiptJo/active-connect-ng/blob/master/LICENSE). You are free to use, modify, and distribute it in accordance with the terms of the license.