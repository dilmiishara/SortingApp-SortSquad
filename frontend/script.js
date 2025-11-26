// Load column names into dropdown when CSV is uploaded
document.getElementById("csvFile").addEventListener("change", function () {
    const file = this.files[0];
    const reader = new FileReader();

    reader.onload = function () {
        const lines = reader.result.split('\n').filter(l => l.trim() !== '');
        if (lines.length === 0) {
            alert("File is empty!");
            return;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const dropdown = document.getElementById("columnDropdown");
        dropdown.innerHTML = '<option value="">-- Select a column --</option>';

        // Parse CSV data rows
        const dataRows = lines.slice(1)
            .map(row => row.split(',').map(cell => cell.trim()))
            .filter(row => row.length === headers.length && row.some(cell => cell !== ''));

        // Detect numeric columns
        headers.forEach((header, colIndex) => {
            let isNumeric = true;
            let hasData = false;

            for (let i = 0; i < dataRows.length; i++) {
                const value = dataRows[i][colIndex];
                if (value && value !== '') {
                    hasData = true;
                    if (!value.match(/^-?\d+(\.\d+)?$/)) {
                        isNumeric = false;
                        break;
                    }
                }
            }

            if (isNumeric && hasData) {
                const option = document.createElement("option");
                option.value = header;
                option.textContent = header;
                dropdown.appendChild(option);
            }
        });

        if (dropdown.children.length === 1) {
            alert("No numeric columns found in this CSV file!\n\nMake sure your CSV has:\n- A header row\n- Numeric data in at least one column\n- No empty rows");
        } else {
            console.log("Found numeric columns:", Array.from(dropdown.options).map(opt => opt.value));
        }
    };

    reader.onload = function(e) {
        const content = e.target.result;
        processCSV(content);
    };

    reader.readAsText(file);
});

function processCSV(csvContent) {
    const lines = csvContent.split('\n').filter(l => l.trim() !== '');
    if (lines.length === 0) {
        alert("File is empty!");
        return;
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const dropdown = document.getElementById("columnDropdown");
    dropdown.innerHTML = '<option value="">-- Select a column --</option>';

    const dataRows = lines.slice(1)
        .map(row => row.split(',').map(cell => cell.trim()))
        .filter(row => row.length === headers.length && row.some(cell => cell !== ''));

    headers.forEach((header, colIndex) => {
        let isNumeric = true;
        let hasData = false;

        for (let i = 0; i < dataRows.length; i++) {
            const value = dataRows[i][colIndex];
            if (value && value !== '') {
                hasData = true;
                if (!value.match(/^-?\d+(\.\d+)?$/)) {
                    isNumeric = false;
                    break;
                }
            }
        }

        if (isNumeric && hasData) {
            const option = document.createElement("option");
            option.value = header;
            option.textContent = header;
            dropdown.appendChild(option);
        }
    });

    if (dropdown.children.length === 1) {
        alert("No numeric columns found!");
    }
}

// Run all sorting algorithms
async function runAllAlgorithms() {
    const fileInput = document.getElementById("csvFile");
    const columnSelect = document.getElementById("columnDropdown");
    const button = document.getElementById("sortButton");
    const resultsDiv = document.getElementById("results");

    if (!fileInput.files.length) {
        alert("Please select a CSV file!");
        return;
    }

    const selectedColumn = columnSelect.value;
    if (!selectedColumn) {
        alert("Please select a numeric column to sort!");
        return;
    }

    // Show loading state
    button.disabled = true;
    button.textContent = "Sorting...";
    resultsDiv.innerHTML = '<div class="loading">🔄 Sorting in progress... Please wait</div>';

    try {
        const file = fileInput.files[0];
        const csvText = await readFileAsText(file);

        console.log("Sending request for column:", selectedColumn);

        const response = await fetch("http://localhost:8080/sort", {
            method: "POST",
            headers: {
                "Content-Type": "text/plain"
            },
            body: csvText + "###" + selectedColumn
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error (${response.status}): ${errorText}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        console.log("Received data:", data);
        displayResults(data);

    } catch (error) {
        console.error("Error:", error);
        resultsDiv.innerHTML = `<div class="error">❌ Error: ${error.message}</div>`;
    } finally {
        button.disabled = false;
        button.textContent = "Run All Sorting Algorithms";
    }
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(new Error("Failed to read file"));
        reader.readAsText(file);
    });
}

function displayResults(data) {
    const resultsDiv = document.getElementById("results");
    const executionTimes = data.executionTimes;

    let tableHTML = `
        <h2>Sorting Algorithm Performance Results</h2>
        <table>
            <thead>
                <tr>
                    <th>Algorithm</th>
                    <th>Execution Time (ms)</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Add rows for each algorithm
    Object.entries(executionTimes).forEach(([algorithm, time]) => {
        const isBest = algorithm === data.bestAlgorithm;
        const rowStyle = isBest ? 'style="background-color: #d4edda; font-weight: bold;"' : '';

        tableHTML += `
            <tr ${rowStyle}>
                <td>${algorithm}</td>
                <td>${time} ms</td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
        <div class="success">
            <h3>🏆 Best Performing Algorithm: ${data.bestAlgorithm}</h3>
            <p>Execution Time: ${data.bestTime} milliseconds</p>
        </div>
    `;

    resultsDiv.innerHTML = tableHTML;
}