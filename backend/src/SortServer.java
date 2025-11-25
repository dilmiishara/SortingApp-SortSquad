import java.io.*;
import java.net.*;
import java.util.*;

public class SortServer {

    // ==================== MAIN METHOD ====================
    public static void main(String[] args) throws Exception {
        // Create a server socket listening on port 8080
        ServerSocket server = new ServerSocket(8080);
        System.out.println("Server running on http://localhost:8080");

        // Continuously accept incoming client connections
        while (true) {
            Socket socket = server.accept();
            new Thread(() -> handle(socket)).start();
        }
    }

    // ==================== HANDLE CLIENT CONNECTION ====================
    private static void handle(Socket socket) {
        try {
            BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            OutputStream out = socket.getOutputStream();

            // Read the first line of HTTP request (e.g., POST /columns HTTP/1.1)
            String line = in.readLine();
            if (line == null) return; // Ignore empty requests

            // Determine which endpoint is requested
            if (line.startsWith("POST /columns")) {
                handleColumnDetection(in, out);
            } else if (line.startsWith("POST /sort")) {
                // Currently stubbed: sorting not implemented yet
                out.write("HTTP/1.1 200 OK\r\n\r\nSorting not implemented yet.".getBytes());
            }

            // Close streams and socket
            out.close();
            socket.close();
        } catch (Exception e) {
            e.printStackTrace(); // Print any exceptions to console
        }
    }

}
