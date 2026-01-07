// ====================================================================
// CSV Sorting Algorithm Analyzer - Frontend Core Module
// Author: [2021T01223, 2021T01258, 2021T01228 /University of Colombo,Faculty of Technology]
// Description: Main JavaScript file for CSV upload, parsing, column
//              detection, and simulated sorting algorithm analysis.
// Version: 1.0.0
// ====================================================================
// Global variables
// Holds CSV content as string
let currentCSVData = null;
// Stores CSV headers
let currentHeaders = [];
// Stores numeric column metadata
let numericColumns = [];

// ---------------------- Initialization ----------------------------
document.addEventListener('DOMContentLoaded', function() {
    initializeUploadArea(); // Set up drag-and-drop and click upload
    initializeEventListeners();  // Set up dropdown change listener
});

// ---------------------- Upload area setup --------------------------
function initializeUploadArea() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('csvFile');

    // Drag and drop functionality
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('active');
    });

    // Remove effect when leaving drag area
    uploadArea.addEventListener('dragleave', function() {
        uploadArea.classList.remove('active');
    });

    // Handle dropped files
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('active');

        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelection(e.dataTransfer.files[0]);
        }
    });

    // Handle click to upload
    uploadArea.addEventListener('click', function() {
        fileInput.click();
    });

    // Handle file selection via input
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length) {
            handleFileSelection(e.target.files[0]);
        }
    });
}

// ---------------------- Event listeners ---------------------------
function initializeEventListeners() {
    // Update preview when column selection changes
    document.getElementById('columnDropdown').addEventListener('change', function() {
        updateDataPreview(this.value);
    });
}

// ---------------------- Handle file selection ----------------------
function handleFileSelection(file) {
    const fileName = document.getElementById('fileName');
    const fileInfo = document.getElementById('fileInfo');
    const fileStats = document.getElementById('fileStats');
    const uploadArea = document.getElementById('uploadArea');

    if (file) {
        // Update UI with selected file name
        fileName.innerHTML = `<i class="fas fa-file-csv"></i><span>${file.name}</span>`;
        fileInfo.classList.add('show');
        uploadArea.classList.add('active');

        // Validate file type
        if (!file.name.toLowerCase().endsWith('.csv')) {
            showError("Please select a CSV file!");
            resetForm();
            return;
        }

        // Read CSV content
        const reader = new FileReader();

        reader.onload = function(e) {
            const content = e.target.result;
            currentCSVData = content;
            processCSV(content, file);
        };

        reader.onerror = function() {
            showError("Error reading file. Please try again.");
            resetForm();
        };

        reader.readAsText(file);
    }
}

// ---------------------- CSV Processing -----------------------------
function processCSV(csvContent, file) {
    console.log("Processing CSV file...");

    const lines = csvContent.split('\n').filter(l => l.trim() !== '');
    if (lines.length === 0) {
        showError("File is empty!");
        resetForm();
        return;
    }

    // Extract headers from first row
    currentHeaders = parseCSVLine(lines[0]);
    console.log("Headers found:", currentHeaders);

    const dropdown = document.getElementById('columnDropdown');
    const columnSection = document.getElementById('columnSection');
    const fileStats = document.getElementById('fileStats');
    const sortButton = document.getElementById('sortButton');
    const dataPreview = document.getElementById('dataPreview');

    dropdown.innerHTML = '<option value="">-- Select a column --</option>';
    numericColumns = [];

    // Parse data rows (skip empty rows)
    const dataRows = [];
    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        if (row.length === currentHeaders.length && row.some(cell => cell.trim() !== '')) {
            dataRows.push(row);
        }
    }

    console.log(`Found ${dataRows.length} data rows`);

    // Update file stats in UI
    fileStats.innerHTML = `
        <div class="stat-item">
            <i class="fas fa-columns"></i>
            <span>${currentHeaders.length} columns</span>
        </div>
        <div class="stat-item">
            <i class="fas fa-list-ol"></i>
            <span>${dataRows.length} rows</span>
        </div>
        <div class="stat-item">
            <i class="fas fa-weight-hanging"></i>
            <span>${formatFileSize(file.size)}</span>
        </div>
    `;

    // Detect numeric columns
    currentHeaders.forEach((header, colIndex) => {
        let isNumeric = true;
        let numericValues = [];
        let hasData = false;
        let emptyCells = 0;

        // Check first 10 rows to determine if column is numeric
        for (let i = 0; i < Math.min(dataRows.length, 10); i++) {
            const value = dataRows[i][colIndex];
            if (value && value.trim() !== '') {
                hasData = true;
                const numValue = parseFloat(value.trim());
                if (isNaN(numValue)) {
                    isNumeric = false;
                    break;
                } else {
                    numericValues.push(numValue);
                }
            } else {
                emptyCells++;
            }
        }

        // Only add column if it has valid numeric data
        if (isNumeric && hasData && numericValues.length > 0) {
            const option = document.createElement('option');
            option.value = header;
            option.textContent = header;
            dropdown.appendChild(option);

            numericColumns.push({
                name: header,
                sample: numericValues.slice(0, 5),
                count: dataRows.length,
                min: Math.min(...numericValues),
                max: Math.max(...numericValues),
                emptyCells: emptyCells,
                totalSamplesChecked: Math.min(dataRows.length, 10)
            });

            console.log(`Found numeric column: ${header} with ${numericValues.length} valid values`);
        }
    });

    // If no numeric columns found, show error
    if (dropdown.children.length === 1) {
        showError("No numeric columns found in this CSV file!\n\nMake sure your CSV has:\n- A header row\n- Numeric data in at least one column\n- No empty rows\n- Proper comma separation");
        console.log("No numeric columns found. Headers:", currentHeaders);
        resetForm();
        return;
    }

    // Prepare UI for column selection
    columnSection.style.display = 'block';
    sortButton.disabled = true;
    dataPreview.style.display = 'none';
    dataPreview.innerHTML = '';

    // Show data preview for first numeric column
    // if (numericColumns.length > 0) {
    //     updateDataPreview(numericColumns[0].name);
    // }
}

// ---------------------- Update data preview ------------------------
function updateDataPreview(columnName) {
    const dataPreview = document.getElementById('dataPreview');
    const selectedColumn = numericColumns.find(col => col.name === columnName);

    // Hide preview if no column is selected
    if (!columnName || !selectedColumn) {
        dataPreview.style.display = 'none';
        dataPreview.innerHTML = '';
        document.getElementById('sortButton').disabled = true;
        return;
    }

    // Show the preview container
    dataPreview.style.display = 'block';

    // Check if the selected column has valid data
    if (!selectedColumn || selectedColumn.sample.length === 0) {
        dataPreview.innerHTML = `
            <div class="warning-message">
                <i class="fas fa-exclamation-triangle"></i>
                <span>No valid numeric data found in "${columnName}" column</span>
            </div>
        `;
        // Enable sort button
        document.getElementById('sortButton').disabled = true;
        return;
    }

    // Check for empty/blank values in sample
    const hasValidData = selectedColumn.sample.some(value =>
        value !== null && value !== undefined && value !== '' && !isNaN(value)
    );

    if (!hasValidData) {
        dataPreview.innerHTML = `
            <div class="warning-message">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Selected column "${columnName}" contains only empty or non-numeric values</span>
            </div>
        `;
        document.getElementById('sortButton').disabled = true;
        return;
    }

    // Calculate statistics only from valid numeric values
    const validValues = selectedColumn.sample.filter(value =>
        value !== null && value !== undefined && value !== '' && !isNaN(value)
    );

    if (validValues.length === 0) {
        dataPreview.innerHTML = `
            <div class="warning-message">
                <i class="fas fa-exclamation-triangle"></i>
                <span>No valid numeric values found in "${columnName}"</span>
            </div>
        `;
        document.getElementById('sortButton').disabled = true;
        return;
    }

    // Calculate min and max from valid values
    const min = Math.min(...validValues);
    const max = Math.max(...validValues);

    // Enable sort button only if we have valid data
    document.getElementById('sortButton').disabled = false;

    // Calculate empty percentage in sampled data
    const emptyPercentage = selectedColumn.emptyCells > 0 ?
        Math.round((selectedColumn.emptyCells / selectedColumn.totalSamplesChecked) * 100) : 0;

    // Display the preview with valid data
    dataPreview.innerHTML = `
        <div class="preview-header">
            <strong><i class="fas fa-columns"></i> Column:</strong> ${selectedColumn.name}
        </div>
        <div class="preview-sample">
            <strong><i class="fas fa-list-ol"></i> Sample Data:</strong> 
            <span class="sample-values">[${validValues.map(v => v.toFixed(2)).join(', ')}...]</span>
        </div>
        <div class="preview-stats">
            <div class="stat-item">
                <strong><i class="fas fa-arrows-alt-h"></i> Range:</strong> ${min.toFixed(2)} to ${max.toFixed(2)}
            </div>
            <div class="stat-item">
                <strong><i class="fas fa-hashtag"></i> Total Values:</strong> ${selectedColumn.count}
            </div>
            <div class="stat-item">
                <strong><i class="fas fa-chart-bar"></i> Valid Samples:</strong> ${validValues.length} of ${selectedColumn.sample.length}
            </div>
            ${emptyPercentage > 0 ? `
            <div class="stat-item warning">
                <strong><i class="fas fa-exclamation-circle"></i> Empty in sample:</strong> ${emptyPercentage}%
            </div>
            ` : ''}
        </div>
    `;
}

// ---------------------- CSV Parsing Helper -------------------------
// Helper function to parse CSV line (handles quotes and commas within fields)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}


// ---------------------- File size formatting -----------------------
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ---------------------- Reset form -------------------------------
function resetForm() {
    document.getElementById('csvFile').value = '';
    document.getElementById('fileName').innerHTML = '<i class="fas fa-file"></i><span>No file selected</span>';
    document.getElementById('fileInfo').classList.remove('show');
    document.getElementById('uploadArea').classList.remove('active');
    document.getElementById('columnSection').style.display = 'none';
    document.getElementById('dataPreview').style.display = 'none';
    document.getElementById('dataPreview').innerHTML = '';
    document.getElementById('sortButton').disabled = true;
    document.getElementById('resultsSection').style.display = 'none';
    currentCSVData = null;
    currentHeaders = [];
    numericColumns = [];
}

// ---------------------- Show error messages ----------------------
function showError(message) {
    // Create a toast notification
    const toast = document.createElement('div');
    toast.className = 'error';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        background: var(--danger);
        color: white;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 1000;
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;

    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 5000);
}

// Run all sorting algorithms
async function runAllAlgorithms() {
    const fileInput = document.getElementById('csvFile');
    const columnSelect = document.getElementById('columnDropdown');
    const button = document.getElementById('sortButton');
    const resultsSection = document.getElementById('resultsSection');
    const resultsDiv = document.getElementById('results');

    if (!fileInput.files.length || !currentCSVData) {
        showError("Please select a CSV file first!");
        return;
    }

    const selectedColumn = columnSelect.value;
    if (!selectedColumn) {
        showError("Please select a numeric column to sort!");
        return;
    }

    // Validate that the selected column has data
    const selectedColumnData = numericColumns.find(col => col.name === selectedColumn);
    if (!selectedColumnData || selectedColumnData.sample.length === 0) {
        showError("The selected column has no valid data to sort!");
        return;
    }

    // Show loading state
    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    resultsSection.style.display = 'block';

    resultsDiv.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <h3>Performance Analysis in Progress</h3>
            <p>Processing "${selectedColumn}" column with multiple algorithms...</p>
            <div class="progress-bar">
                <div class="progress"></div>
            </div>
        </div>
    `;

    try {
        console.log("Sending request for column:", selectedColumn);

        const response = await fetch("http://localhost:8080/sort", {
            method: "POST",
            headers: {
                "Content-Type": "text/plain"
            },
            body: currentCSVData + "###" + selectedColumn
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Server error (${response.status})`;
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        console.log("Received data:", data);
        displayResults(data);

    } catch (error) {
        console.error("Error:", error);
        resultsDiv.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Analysis Failed</h3>
                <p>${error.message}</p>
                <button onclick="retrySort()" class="btn-primary" style="margin-top: 15px;">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    } finally {
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-play"></i> Analyze Performance';
    }
}

function retrySort() {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';
    runAllAlgorithms();
}

function displayResults(data) {
    const resultsDiv = document.getElementById('results');
    const executionTimes = data.executionTimes;

    // Create performance chart
    const algorithms = Object.keys(executionTimes);
    const times = Object.values(executionTimes);
    const maxTime = Math.max(...times);

    let chartHTML = `
        <div class="performance-chart">
            <div class="chart-header">
                <h3><i class="fas fa-chart-bar"></i> Algorithm Performance Comparison</h3>
            </div>
            <div class="chart-bars">
    `;

    algorithms.forEach((algorithm, index) => {
        const time = times[index];
        const percentage = Math.max((time / maxTime) * 90, 10); // Minimum 10% width
        const isBest = algorithm === data.bestAlgorithm;

        chartHTML += `
            <div class="chart-bar-container">
                <div class="chart-bar-label">
                    <i class="fas fa-sort-amount-down"></i>
                    ${algorithm}
                </div>
                <div class="chart-bar ${isBest ? 'best' : ''}" style="width: ${percentage}%">
                    <span class="chart-bar-time">${time} ms</span>
                </div>
            </div>
        `;
    });

    chartHTML += `</div></div>`;

    let tableHTML = `
        ${chartHTML}
        <table class="results-table">
            <thead>
                <tr>
                    <th>Algorithm</th>
                    <th>Execution Time</th>
                    <th>Performance</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Add rows for each algorithm
    Object.entries(executionTimes).forEach(([algorithm, time]) => {
        const isBest = algorithm === data.bestAlgorithm;
        const rowClass = isBest ? 'best-algorithm' : '';

        tableHTML += `
            <tr class="${rowClass}">
                <td><i class="fas fa-sort-amount-down"></i> ${algorithm}</td>
                <td><strong>${time} ms</strong></td>
                <td>${isBest ? '<span class="best-badge"><i class="fas fa-trophy"></i> FASTEST</span>' : ''}</td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
        <div class="success-summary">
            <h3><i class="fas fa-trophy"></i> Best Performing Algorithm</h3>
            <p style="font-size: 1.2rem; margin-bottom: 5px;"><strong>${data.bestAlgorithm}</strong></p>
            <p style="margin-bottom: 10px;">Execution Time: ${data.bestTime} milliseconds</p>
            <small>Results may vary based on dataset characteristics and system performance</small>
        </div>
    `;

    resultsDiv.innerHTML = tableHTML;
}

// Add sample CSV download functionality
function downloadSampleCSV() {
    const sampleCSV = `Name,Age,Salary,Score,Experience
John Doe,25,50000,85.5,2
Jane Smith,30,60000,92.3,5
Bob Johnson,35,55000,78.9,8
Alice Brown,28,52000,88.1,4
Charlie Wilson,40,70000,95.7,12
Diana Lee,32,65000,91.2,7
Mike Chen,29,48000,76.8,3
Sarah Johnson,45,75000,96.5,20
Tom Williams,27,51000,82.4,3
Emily Davis,38,68000,89.7,10`;

    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-dataset.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    // Show success message
    const toast = document.createElement('div');
    toast.className = 'success-summary';
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 1000;
        max-width: 300px;
        animation: slideIn 0.3s ease;
    `;

    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-check-circle"></i>
            <span>Sample dataset downloaded!</span>
        </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Add CSS animations and styles for data preview
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .data-preview {
        margin-top: 10px;
        padding: 12px;
        background: var(--dark-light);
        border-radius: 8px;
        font-size: 0.9rem;
        color: var(--text-muted);
        border-left: 3px solid var(--success);
        display: none; /* Hidden by default */
    }
    
    .warning-message {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--warning);
        padding: 8px;
        background: rgba(247, 37, 133, 0.1);
        border-radius: 6px;
        border-left: 3px solid var(--warning);
    }
    
    .warning-message i {
        color: var(--warning);
    }
    
    .preview-header {
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--border);
    }
    
    .preview-header i {
        color: var(--success);
    }
    
    .preview-sample {
        margin-bottom: 10px;
    }
    
    .sample-values {
        font-family: 'Courier New', monospace;
        background: rgba(0, 0, 0, 0.2);
        padding: 2px 6px;
        border-radius: 4px;
        margin-left: 5px;
    }
    
    .preview-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 8px;
        margin-top: 10px;
    }
    
    .preview-stats .stat-item {
        padding: 6px 8px;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 4px;
        font-size: 0.85rem;
    }
    
    .preview-stats .stat-item i {
        margin-right: 5px;
        color: var(--success);
    }
    
    .preview-stats .stat-item.warning i {
        color: var(--warning);
    }
    
    .preview-stats .stat-item.warning {
        background: rgba(247, 37, 133, 0.1);
        color: var(--warning);
    }
`;
document.head.appendChild(style);