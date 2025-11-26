import java.io.*;
import java.net.*;
import java.util.*;

public class SortServer {

    public static void main(String[] args) {
        try {
            ServerSocket server = new ServerSocket(8080);
            System.out.println("CSV Server running on http://localhost:8080");

            while (true) {
                Socket socket = server.accept();
                new Thread(() -> handle(socket)).start();
            }

        } catch (IOException e) {
            System.err.println("Server error: " + e.getMessage());
        }
    }

    private static void handle(Socket socket) {
        try {
            BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            OutputStream out = socket.getOutputStream();

            String requestLine = in.readLine();
            if (requestLine == null) return;

            int contentLength = 0;
            String header;
            while ((header = in.readLine()) != null && !header.isEmpty()) {
                if (header.toLowerCase().startsWith("content-length:")) {
                    contentLength = Integer.parseInt(header.substring(15).trim());
                }
            }

            // Read body
            char[] bodyChars = new char[contentLength];
            in.read(bodyChars);
            String body = new String(bodyChars);

            if (requestLine.startsWith("POST /csv")) {
                handleCSVRequest(body, out);
            } else {
                out.write("HTTP/1.1 200 OK\r\n\r\nCSV Server Running".getBytes());
            }

            out.close();
            in.close();
            socket.close();

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static void handleCSVRequest(String body, OutputStream out) throws Exception {

        // Format: CSV_DATA ### COLUMN_INDEX
        String[] parts = body.split("###");
        if (parts.length < 2) {
            sendError(out, "Invalid format. Expected: CSV###COLUMN_INDEX");
            return;
        }

        String csvData = parts[0].trim();
        int colIndex;

        try {
            colIndex = Integer.parseInt(parts[1].trim());
        } catch (NumberFormatException e) {
            sendError(out, "Column index must be a number");
            return;
        }

        List<String[]> rows = parseCSV(csvData);

        if (rows.size() < 2) {
            sendError(out, "CSV must have header + at least 1 row");
            return;
        }

        // Extract numeric column
        List<Double> numericValues = extractNumericColumn(rows, colIndex);

        // Build JSON manually
        String json = "{ \"values\": " + numericValues.toString() + " }";

        String response = "HTTP/1.1 200 OK\r\n" +
                "Content-Type: application/json\r\n" +
                "Access-Control-Allow-Origin: *\r\n" +
                "Content-Length: " + json.length() + "\r\n\r\n" +
                json;

        out.write(response.getBytes());
    }

    // ---- CSV FUNCTIONS ----

    public static List<String[]> parseCSV(String csv) {
        List<String[]> rows = new ArrayList<>();
        String[] lines = csv.split("\n");

        for (String line : lines) {
            rows.add(line.split(","));
        }

        return rows;
    }

    public static List<Double> extractNumericColumn(List<String[]> rows, int colIndex) {
        List<Double> values = new ArrayList<>();

        for (int i = 1; i < rows.size(); i++) { // skip header
            String[] row = rows.get(i);

            if (colIndex < row.length) {
                try {
                    values.add(Double.parseDouble(row[colIndex]));
                } catch (Exception ignored) {}
            }
        }

        return values;
    }

    private static void sendError(OutputStream out, String msg) throws IOException {
        String json = "{ \"error\": \"" + msg + "\" }";
        String response = "HTTP/1.1 400 Bad Request\r\n" +
                "Content-Type: application/json\r\n" +
                "Access-Control-Allow-Origin: *\r\n" +
                "Content-Length: " + json.length() + "\r\n\r\n" +
                json;

        out.write(response.getBytes());
    }
}
