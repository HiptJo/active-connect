## Active-Connect

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

    @Auth(new UserLoggedInAuthenticator())
    @Outbound("data.user")
    async getUser(connection: WebsocketConnection): Promise<User> {
        return await Users.getUser(connection.token);
    }
}

@HttpRoute("/api/users")
class UserManagementHttpService {
    @GET("/")
    async getAllUsers(): Promise<HttpResponse> {
        return { content: JSON.stringify(await Users.getAll()), contentType: "application/json", status: 200, contentEncoding: "binary" };
    }

    @POST("/http/user")
    async createUser(request: HttpRequest): Promise<HttpResponse> {
        // Handle the HTTP request here and return an HttpResponse.
        // For example, create a new user and return the appropriate response.
        return { content: "User created successfully!", contentType: "text/plain", status: 201, contentEncoding: "binary" };
    }

    @PUT("/http/user/:id")
    async updateUser(request: HttpRequest): Promise<HttpResponse> {
        // Handle the HTTP request here and return an HttpResponse.
        // For example, update the user data and return the appropriate response.
        return { content: "User updated successfully!", contentType: "text/plain", status: 200, contentEncoding: "binary" };
    }

    @DELETE("/api/user/:id")
    async deleteUser(request: HttpRequest): Promise<HttpResponse> {
        // Handle the HTTP request here and return an HttpResponse.
        // For example, delete the user and return the appropriate response.
        return { content: "User deleted successfully!", contentType: "text/plain", status: 200, contentEncoding: "binary" };
    }
}
```

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

### FileProvider Example

```typescript
class FileProviderService {
    // This method will be triggered when the client requests a file with the given name.
    // The decorator @ProvideFile specifies the identifier for this file provider ("document" in this example).
    // It is accessible via GET /file/document/:id/:auth
    @Auth(new Authenticator())
    @ProvideFile("document")
    public async getDocument(id: string, auth: string): Promise<ProvidedFile> {
        try {
            // Replace the following logic with your own file retrieval mechanism.
            // For example, retrieve the file content from a database or generate it on the fly.
            const { content, contentType, label } = await retrieveFileContentFromDatabase(id);
            return new ProvidedFile(
                id, // The id of the file
                label, // Unique identifier for the file
                content, // File content as a Buffer or string
                contentType, // MIME type of the file content
            );
        } catch (error) {
            // Return an appropriate response if the file is not found or an error occurs.
            throw new HttpNotFoundError("File has not been found");
        }
    }
}

```

### ImageProvider Example

```typescript
class ImageProviderService {
    // This method will be triggered when the client requests an image with the given name.
    // The decorator @ProvideImage specifies the identifier for this image provider ("ci" in this example).
    // It is accessible via GET /image/ci/:id/:auth
    @Auth(new Authenticator())
    @ProvideImage("ci")
    public async getSampleImage(id:string, auth:string): Promise<ProvidedImage> {
        try {
            // Replace the following logic with your own image retrieval mechanism.
            // For example, retrieve the image data from a database or generate it on the fly.
            const imageBuffer = await retrieveImageFromDatabase(id);
            return ProvidedImage.getFromBuffer(
                imageBuffer, // Image data as a Buffer
                1, // Image quality (1 is the highest)
                "image/png" // MIME type of the image
            );
        } catch (error) {
            // Return an appropriate response if the file is not found or an error occurs.
            throw new HttpNotFoundError("File has not been found");
        }
    }
}
```

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

Active-Connect is open-source software licensed under the [MIT License](https://github.com/HiptJo/active-connect-ng/blob/master/LICENSE). You are free to use, modify, and distribute it in accordance with the terms of the license.