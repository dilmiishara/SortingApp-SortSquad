import java.io.*;
import java.net.*;

public class TestServer {
    public static void main(String[] args) throws Exception {
        ServerSocket server = new ServerSocket(8080);
        System.out.println(" Server started successfully on port 8080");
        System.out.println(" Test URL: http://localhost:8080");

        while (true) {
            Socket socket = server.accept();
            System.out.println(" New connection received!");

            // Simple response for testing
            String response = "HTTP/1.1 200 OK\r\n\r\nServer is working!";
            socket.getOutputStream().write(response.getBytes());
            socket.close();
        }
    }
}