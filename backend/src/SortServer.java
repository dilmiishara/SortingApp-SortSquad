import java.io.*;
import java.net.*;
import java.util.*;

/**
 * SortServer
 * ----------
 * A simple HTTP server that accepts CSV data and a column name,
 * runs multiple sorting algorithms on the selected numeric column,
 * measures execution time, and returns results as JSON.
 */

public class SortServer {

    /**
     * Main method – starts the server on port 8080
     */
    public static void main(String[] args) throws Exception {
        try {
            // Create server socket on port 8080
            ServerSocket server = new ServerSocket(8080);
            System.out.println("Server running on http://localhost:8080");
            System.out.println("Ready to accept connections...");

            // Continuously listen for client requests
            while (true) {
                Socket socket = server.accept();
                System.out.println("New client connected");

                // Handle each client in a separate thread
                new Thread(() -> handle(socket)).start();
            }
        } catch (IOException e) {
            System.err.println("Server error: " + e.getMessage());
        }
    }

    /**
     * Handles incoming HTTP requests
     */

    private static void handle(Socket socket) {
        try {
            // Input stream to read request
            BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            // Output stream to send response
            OutputStream out = socket.getOutputStream();

            String requestLine = in.readLine();
            if (requestLine == null) {
                socket.close();
                return;
            }

            System.out.println("Received: " + requestLine);

            // Read HTTP headers and extract Content-Length
            String line;
            int contentLength = 0;
            while ((line = in.readLine()) != null && !line.isEmpty()) {
                if (line.toLowerCase().startsWith("content-length:")) {
                    contentLength = Integer.parseInt(line.substring(15).trim());
                }
            }

            // Read request body based on Content-Length
            StringBuilder bodyBuilder = new StringBuilder();
            if (contentLength > 0) {
                char[] bodyChars = new char[contentLength];
                in.read(bodyChars, 0, contentLength);
                bodyBuilder.append(bodyChars);
            }

            String body = bodyBuilder.toString();
            System.out.println("Body received: " + body.length() + " characters");

            // Route request based on path
            if (requestLine.startsWith("POST /sort")) {
                handleSortRequest(body, out);
            } else {
                // Default response for other routes
                String response = "HTTP/1.1 200 OK\r\n" +
                        "Content-Type: text/plain\r\n" +
                        "Access-Control-Allow-Origin: *\r\n\r\n" +
                        "SortServer is running!";
                out.write(response.getBytes());
            }

            // Close resources
            out.close();
            in.close();
            socket.close();

        } catch (Exception e) {
            System.err.println("Error handling request: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Processes CSV sorting requests
     */
    private static void handleSortRequest(String body, OutputStream out) throws Exception {
        try {
            // Expected format: CSV_DATA ### COLUMN_NAME
            String[] parts = body.split("###");
            if (parts.length < 2) {
                throw new Exception("Invalid request format. Expected: CSV###COLUMN");
            }

            String csvData = parts[0].trim();
            String columnName = parts[1].trim();

            System.out.println("Processing CSV data for column: " + columnName);
            System.out.println("CSV sample: " + csvData.substring(0, Math.min(100, csvData.length())));

            // Split CSV into rows
            List<String[]> rows = new ArrayList<>();
            String[] lines = csvData.split("\r\n|\n");

            for (String line : lines) {
                if (!line.trim().isEmpty()) {
                    rows.add(line.split(","));
                }
            }

            // CSV must contain header + at least one data row
            if (rows.size() < 2) {
                throw new Exception("CSV must have header and at least one data row");
            }

            // Identify the index of the selected column
            String[] header = rows.get(0);
            int columnIndex = -1;
            for (int i = 0; i < header.length; i++) {
                if (header[i].trim().equalsIgnoreCase(columnName)) {
                    columnIndex = i;
                    break;
                }
            }

            if (columnIndex == -1) {
                throw new Exception(
                        "Column '" + columnName + "' not found. Available columns: " +
                                Arrays.toString(header)
                );
            }

            // Extract numeric values from selected column
            List<Double> numericData = new ArrayList<>();
            for (int i = 1; i < rows.size(); i++) {
                if (columnIndex < rows.get(i).length) {
                    String value = rows.get(i)[columnIndex].trim();
                    try {
                        numericData.add(Double.parseDouble(value));
                    } catch (NumberFormatException e) {
                        throw new Exception("Non-numeric value found: '" + value + "'");
                    }
                }
            }

            if (numericData.isEmpty()) {
                throw new Exception("No numeric data found in column: " + columnName);
            }

            // Convert numeric values to String array
            String[] originalCol = new String[numericData.size()];
            for (int i = 0; i < numericData.size(); i++) {
                originalCol[i] = String.valueOf(numericData.get(i));
            }

            System.out.println("Sorting " + originalCol.length + " numeric values");

            // Store execution times of each algorithm
            Map<String, Long> executionTimes = new LinkedHashMap<>();
            String[] algorithms = { "Insertion Sort", "Shell Sort", "Merge Sort", "Quick Sort", "Heap Sort" };

            // Run all sorting algorithms
            for (String algo : algorithms) {
                String[] arr = Arrays.copyOf(originalCol, originalCol.length);
                long start = System.nanoTime();

                switch (algo) {
                    case "Insertion Sort" -> insertionSort(arr);
                    case "Shell Sort" -> shellSort(arr);
                    case "Merge Sort" -> mergeSort(arr);
                    case "Quick Sort" -> quickSort(arr, 0, arr.length - 1);
                    case "Heap Sort" -> heapSort(arr);
                }

                long end = System.nanoTime();
                executionTimes.put(algo, (end - start) / 1_000_000);
            }

            // Determine fastest algorithm
            String bestAlgorithm = Collections.min(
                    executionTimes.entrySet(),
                    Map.Entry.comparingByValue()
            ).getKey();
            long bestTime = executionTimes.get(bestAlgorithm);

            // Build JSON response manually
            StringBuilder json = new StringBuilder("{");
            json.append("\"executionTimes\": {");

            boolean first = true;
            for (Map.Entry<String, Long> entry : executionTimes.entrySet()) {
                if (!first) json.append(",");
                json.append("\"").append(entry.getKey()).append("\": ").append(entry.getValue());
                first = false;
            }
            json.append("}, ");
            json.append("\"bestAlgorithm\": \"").append(bestAlgorithm).append("\", ");
            json.append("\"bestTime\": ").append(bestTime);
            json.append("}");

            // Send HTTP response
            String response =
                    "HTTP/1.1 200 OK\r\n" +
                            "Content-Type: application/json\r\n" +
                            "Access-Control-Allow-Origin: *\r\n" +
                            "Content-Length: " + json.length() + "\r\n\r\n" +
                            json;

            out.write(response.getBytes());
            System.out.println("Response sent successfully");

        } catch (Exception e) {
            // Send error response as JSON
            System.err.println("Error: " + e.getMessage());
            String errorJson = "{\"error\": \"" + e.getMessage().replace("\"", "\\\"") + "\"}";
            String errorResponse =
                    "HTTP/1.1 500 Internal Server Error\r\n" +
                            "Content-Type: application/json\r\n" +
                            "Access-Control-Allow-Origin: *\r\n" +
                            "Content-Length: " + errorJson.length() + "\r\n\r\n" +
                            errorJson;

            out.write(errorResponse.getBytes());
        }
    }

    /* ===================== SORTING ALGORITHMS ===================== */

    // Insertion Sort
    static void insertionSort(String[] arr) {
        for (int i = 1; i < arr.length; i++) {
            String key = arr[i];
            int j = i - 1;
            while (j >= 0 && Double.parseDouble(arr[j]) > Double.parseDouble(key)) {
                arr[j + 1] = arr[j];
                j--;
            }
            arr[j + 1] = key;
        }
    }

    // Shell Sort
    static void shellSort(String[] arr) {
        int n = arr.length;
        for (int gap = n / 2; gap > 0; gap /= 2) {
            for (int i = gap; i < n; i++) {
                String temp = arr[i];
                int j = i;
                while (j >= gap && Double.parseDouble(arr[j - gap]) > Double.parseDouble(temp)) {
                    arr[j] = arr[j - gap];
                    j -= gap;
                }
                arr[j] = temp;
            }
        }
    }

    // Merge Sort
    static void mergeSort(String[] arr) {
        String[] temp = new String[arr.length];
        mergeSortHelper(arr, temp, 0, arr.length - 1);
    }

    static void mergeSortHelper(String[] arr, String[] temp, int left, int right) {
        if (left >= right) return;
        int mid = (left + right) / 2;

        mergeSortHelper(arr, temp, left, mid);
        mergeSortHelper(arr, temp, mid + 1, right);

        System.arraycopy(arr, left, temp, left, right - left + 1);

        int i = left, j = mid + 1, k = left;
        while (i <= mid && j <= right) {
            if (Double.parseDouble(temp[i]) <= Double.parseDouble(temp[j])) {
                arr[k++] = temp[i++];
            } else {
                arr[k++] = temp[j++];
            }
        }

        while (i <= mid) arr[k++] = temp[i++];
        while (j <= right) arr[k++] = temp[j++];
    }

    // Quick Sort
    static void quickSort(String[] arr, int low, int high) {
        if (low < high) {
            int pi = partition(arr, low, high);
            quickSort(arr, low, pi - 1);
            quickSort(arr, pi + 1, high);
        }
    }

    static int partition(String[] arr, int low, int high) {
        double pivot = Double.parseDouble(arr[high]);
        int i = low - 1;

        for (int j = low; j < high; j++) {
            if (Double.parseDouble(arr[j]) <= pivot) {
                i++;
                String temp = arr[i];
                arr[i] = arr[j];
                arr[j] = temp;
            }
        }
        String temp = arr[i + 1];
        arr[i + 1] = arr[high];
        arr[high] = temp;

        return i + 1;
    }

    // Heap Sort
    static void heapSort(String[] arr) {
        int n = arr.length;

        for (int i = n / 2 - 1; i >= 0; i--) {
            heapify(arr, n, i);
        }

        for (int i = n - 1; i > 0; i--) {
            String temp = arr[0];
            arr[0] = arr[i];
            arr[i] = temp;

            heapify(arr, i, 0);
        }
    }

    static void heapify(String[] arr, int n, int i) {
        int largest = i;
        int left = 2 * i + 1;
        int right = 2 * i + 2;

        if (left < n && Double.parseDouble(arr[left]) > Double.parseDouble(arr[largest])) {
            largest = left;
        }
        if (right < n && Double.parseDouble(arr[right]) > Double.parseDouble(arr[largest])) {
            largest = right;
        }

        if (largest != i) {
            String swap = arr[i];
            arr[i] = arr[largest];
            arr[largest] = swap;

            heapify(arr, n, largest);
        }
    }
}
