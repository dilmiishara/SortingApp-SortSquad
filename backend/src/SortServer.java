import java.io.*;
import java.net.*;
import java.util.*;

public class SortServer {

    public static void main(String[] args) {
        try {
            ServerSocket server = new ServerSocket(8080);
            System.out.println("Server running on http://localhost:8080");

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

            if (requestLine.startsWith("OPTIONS")) {
                sendCORSResponse(out);
                return;
            }

            int contentLength = 0;
            String header;
            while ((header = in.readLine()) != null && !header.isEmpty()) {
                if (header.toLowerCase().startsWith("content-length:")) {
                    contentLength = Integer.parseInt(header.substring(15).trim());
                }
            }

            char[] bodyChars = new char[contentLength];
            in.read(bodyChars);
            String body = new String(bodyChars);

            if (requestLine.startsWith("POST /csv")) {
                handleCSVRequest(body, out);

            } else if (requestLine.startsWith("POST /sort")) {
                handleSortRequest(body, out);

            } else {
                out.write("HTTP/1.1 200 OK\r\n\r\nSort Server Running".getBytes());
            }

            out.close();
            in.close();
            socket.close();

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // ================= CSV HANDLING ==================

    private static void handleCSVRequest(String body, OutputStream out) throws Exception {

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

        List<Double> numericValues = extractNumericColumn(rows, colIndex);

        String json = "{ \"values\": " + numericValues.toString() + " }";

        String response = "HTTP/1.1 200 OK\r\n" +
                "Content-Type: application/json\r\n" +
                "Access-Control-Allow-Origin: *\r\n" +
                "Content-Length: " + json.length() + "\r\n\r\n" +
                json;

        out.write(response.getBytes());
    }

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

        for (int i = 1; i < rows.size(); i++) {
            String[] row = rows.get(i);

            if (colIndex < row.length) {
                try {
                    values.add(Double.parseDouble(row[colIndex]));
                } catch (Exception ignored) {}
            }
        }

        return values;
    }

    // ================= SORT REQUEST HANDLING ==================

    private static void handleSortRequest(String body, OutputStream out) throws Exception {

        String[] parts = body.split("###");
        if (parts.length < 3) {
            sendError(out, "Invalid sort request format.");
            return;
        }

        String sortType = parts[0].trim().toLowerCase();
        String colIndexStr = parts[1].trim();
        String valuesStr = parts[2].trim();

        int colIndex;
        try {
            colIndex = Integer.parseInt(colIndexStr);
        } catch (Exception e) {
            sendError(out, "Column index must be a number");
            return;
        }

        valuesStr = valuesStr.replace("[", "").replace("]", "");
        List<Double> values = new ArrayList<>();

        for (String s : valuesStr.split(",")) {
            try {
                values.add(Double.parseDouble(s.trim()));
            } catch (Exception ignored) { }
        }

        double[] arr = new double[values.size()];
        for (int i = 0; i < values.size(); i++) arr[i] = values.get(i);

        long start = System.nanoTime();

        // ================= APPLY SORTS =================
        if (sortType.equals("heap")) {
            heapSort(arr);
        }
        else if (sortType.equals("quick")) {
            quickSort(arr, 0, arr.length - 1);
        }

        long end = System.nanoTime();
        long timeTaken = end - start;

        List<Double> sorted = new ArrayList<>();
        for (double v : arr) sorted.add(v);

        String json = "{ \"sortType\": \"" + sortType + "\", "
                + "\"time\": " + timeTaken + ", "
                + "\"sortedValues\": " + sorted.toString() + " }";

        String response = "HTTP/1.1 200 OK\r\n" +
                "Content-Type: application/json\r\n" +
                "Access-Control-Allow-Origin: *\r\n" +
                "Content-Length: " + json.length() + "\r\n\r\n" +
                json;

        out.write(response.getBytes());
    }

    // ================= HEAP SORT ==================

    public static void heapSort(double[] arr) {
        int n = arr.length;

        for (int i = n / 2 - 1; i >= 0; i--)
            heapify(arr, n, i);

        for (int i = n - 1; i >= 0; i--) {
            double temp = arr[0];
            arr[0] = arr[i];
            arr[i] = temp;

            heapify(arr, i, 0);
        }
    }

    private static void heapify(double[] arr, int n, int i) {
        int largest = i;
        int left = 2 * i + 1;
        int right = 2 * i + 2;

        if (left < n && arr[left] > arr[largest])
            largest = left;

        if (right < n && arr[right] > arr[largest])
            largest = right;

        if (largest != i) {
            double swap = arr[i];
            arr[i] = arr[largest];
            arr[largest] = swap;

            heapify(arr, n, largest);
        }
    }

    // ================= QUICK SORT ==================

    public static void quickSort(double[] arr, int low, int high) {
        if (low < high) {
            int pi = partition(arr, low, high);

            quickSort(arr, low, pi - 1);
            quickSort(arr, pi + 1, high);
        }
    }

    private static int partition(double[] arr, int low, int high) {
        double pivot = arr[high];
        int i = low - 1;

        for (int j = low; j < high; j++) {
            if (arr[j] <= pivot) {
                i++;

                double temp = arr[i];
                arr[i] = arr[j];
                arr[j] = temp;
            }
        }

        double temp = arr[i + 1];
        arr[i + 1] = arr[high];
        arr[high] = temp;

        return i + 1;
    }

    // ================== HELPERS ====================

    private static void sendError(OutputStream out, String msg) throws IOException {
        String json = "{ \"error\": \"" + msg + "\" }";
        String response = "HTTP/1.1 400 Bad Request\r\n" +
                "Content-Type: application/json\r\n" +
                "Access-Control-Allow-Origin: *\r\n" +
                "Content-Length: " + json.length() + "\r\n\r\n" +
                json;

        out.write(response.getBytes());
    }

    private static void sendCORSResponse(OutputStream out) throws IOException {
        String response =
                "HTTP/1.1 204 No Content\r\n" +
                        "Access-Control-Allow-Origin: *\r\n" +
                        "Access-Control-Allow-Methods: POST, GET, OPTIONS\r\n" +
                        "Access-Control-Allow-Headers: Content-Type\r\n\r\n";

        out.write(response.getBytes());
    }
}
