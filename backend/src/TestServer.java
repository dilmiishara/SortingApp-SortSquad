import java.io.*;
import java.net.*;

/**
 * TestServer
 * ----------
 * A simple HTTP server for testing purposes.
 * It listens on port 8080 and responds with a simple message
 * to any client that connects.
 */

public class TestServer {
    public static void main(String[] args) throws Exception {
        // Create a server socket listening on port 8080
        ServerSocket server = new ServerSocket(8080);
        System.out.println(" Server started successfully on port 8080");
        System.out.println(" Test URL: http://localhost:8080");

        // Continuously listen for client connections
        while (true) {
            // Accept incoming client connection
            Socket socket = server.accept();
            System.out.println(" New connection received!");

            // Prepare a simple HTTP response
            String response = "HTTP/1.1 200 OK\r\n\r\nServer is working!";

            // Send response to client
            socket.getOutputStream().write(response.getBytes());

            // Close client connection
            socket.close();
        }
    }
}