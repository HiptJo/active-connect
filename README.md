## Active-Connect

[![Tests](https://github.com/HiptJo/active-connect-ng/actions/workflows/test.yml/badge.svg?branch=master)](https://github.com/HiptJo/active-connect-ng/actions/workflows/test.yml)

Active-Connect is a powerful connection framework designed for smart web-based projects using Node.js, Angular, and WebSockets. It provides decorators and utilities to simplify the integration of Angular with a WebSocket server, making it easier to handle real-time communication between clients and the server.

## Features

- **HTTP Server with Decorators**: In addition to WebSocket support, Active-Connect allows developers to handle regular HTTP requests with ease. The framework provides decorators for various HTTP methods such as GET, POST, PUT, DELETE, making it simple to define custom routes and functionalities.

- **WebSocket Communication**: Active-Connect offers a powerful connection framework that enables real-time communication between clients and the server in smart web-based projects. When a connection accesses data for the first time, a subscription is automatically created. Any modifications to the data are then sent to all subscribing clients, ensuring efficient and automatic updates.

- **Serve Images and Files via HTTP**: Active-Connect supports efficient serving of images and files via HTTP. Developers can create custom providers for serving files and images, allowing for dynamic and structured delivery to clients. For instance, developers can generate and serve auto-generated images.

- **Customizable Authenticators**: Developers can easily implement their own authenticators by extending the abstract `WebsocketAuthenticator` class. Within the `authenticate` method, access to the connection and request objects allows for easy permission checking. Additionally, clients can store session tokens to facilitate secure authentication.

- **Outbound Methods with Subscription Management**: Active-Connect provides outbound methods that automatically handle subscription management. Developers can easily send data to clients using the `@Outbound(...)` decorator. Subscribing clients receive updates whenever relevant data changes, optimizing data distribution and minimizing unnecessary network traffic.

- **Integration Testing**: Active-Connect facilitates integration testing for both WebSocket and HTTP functionalities. Developers can thoroughly test the server-side implementation of their application's communication process, primarily using Jest and potentially other testing frameworks.

- **Optimized Real-Time Updates**: Active-Connect's WebSocket-based communication reduces the need for frequent polling, resulting in more efficient API requests and real-time data updates. This optimization significantly improves the application's responsiveness and overall user experience.

- **Node-Cron Integration**: Active-Connect internally uses the popular Node-Cron library for scheduling cronjobs. Developers can create cronjobs using the `@Cron` decorator, facilitating the execution of scheduled tasks at specific intervals.

These features collectively empower developers to create smart and efficient web-based projects, handle real-time communication with clients, and optimize data distribution for improved user experiences.

## Authenticators

Authenticators are used to verify whether a client has sufficient permissions to perform a specific action. They can be applied to routes, outbounds, or when serving files/images. For example, the `@Auth` decorator in the provided example is used to enforce authentication for the `user.save` route.

## Filters

Filters are used to associate connections and data with subscription groups. They facilitate efficient data updates by sending data only to clients matching the filter when the associated data changes. Filters are not used for data validation, but rather for efficient data distribution.

## Outbounds

The `@Outbound(...)` decorator enables easy sending of data to clients. Outbounds automatically handle updates and send them to subscribing clients whenever a subscription is created.

## Regular HTTP Requests

In addition to WebSocket support, Active-Connect allows you to handle regular HTTP requests using decorators. These decorators let you define routes for HTTP methods such as GET, POST, PUT, DELETE.

### FileProviders and ImageProviders

Active-Connect supports FileProviders and ImageProviders to efficiently serve files and images to clients. These providers allow you to customize the handling of file and image requests and deliver them in a structured manner.


## Usage

Active-Connect is designed for the entire communication process, and this package contains the server-side implementation. To connect an Angular application with an Active-Connect server, developers can use the `active-connect-ng2` framework available via npm.

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

Active-Connect is open-source software licensed under the MIT License. You are free to use, modify, and distribute it in accordance with the terms of the license.