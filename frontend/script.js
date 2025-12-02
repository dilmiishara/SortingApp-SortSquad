// Part 1: Core Functionality - File Upload & CSV Processing
let currentCSVData = null;
let currentHeaders = [];
let numericColumns = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeUploadArea();
    initializeEventListeners();
});

function initializeUploadArea() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('csvFile');

    // Drag and drop functionality
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('active');
    });

    uploadArea.addEventListener('dragleave', function() {
        uploadArea.classList.remove('active');
    });

    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('active');

        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileSelection(e.dataTransfer.files[0]);
        }
    });

    // Click to upload
    uploadArea.addEventListener('click', function() {
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length) {
            handleFileSelection(e.target.files[0]);
        }
    });
}

function initializeEventListeners() {
    // Column selection change
    document.getElementById('columnDropdown').addEventListener('change', function() {
        updateDataPreview(this.value);
        document.getElementById('sortButton').disabled = !this.value;
    });
}

function handleFileSelection(file) {
    const fileName = document.getElementById('fileName');
    const fileInfo = document.getElementById('fileInfo');
    const fileStats = document.getElementById('fileStats');
    const uploadArea = document.getElementById('uploadArea');

    if (file) {
        // Update UI
        fileName.innerHTML = `<i class="fas fa-file-csv"></i><span>${file.name}</span>`;
        fileInfo.classList.add('show');
        uploadArea.classList.add('active');

        // Validate file type
        if (!file.name.toLowerCase().endsWith('.csv')) {
            showError("Please select a CSV file!");
            resetForm();
            return;
        }

        // Read file
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

function processCSV(csvContent, file) {
    console.log("Processing CSV file...");

    const lines = csvContent.split('\n').filter(l => l.trim() !== '');
    if (lines.length === 0) {
        showError("File is empty!");
        resetForm();
        return;
    }

    // Parse headers
    currentHeaders = parseCSVLine(lines[0]);
    console.log("Headers found:", currentHeaders);

    const dropdown = document.getElementById('columnDropdown');
    const columnSection = document.getElementById('columnSection');
    const fileStats = document.getElementById('fileStats');
    const sortButton = document.getElementById('sortButton');

    dropdown.innerHTML = '<option value="">-- Select a column --</option>';
    numericColumns = [];

    // Parse data rows
    const dataRows = [];
    for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i]);
        if (row.length === currentHeaders.length && row.some(cell => cell.trim() !== '')) {
            dataRows.push(row);
        }
    }

    console.log(`Found ${dataRows.length} data rows`);

    // Update file stats
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

    // Find numeric columns
    currentHeaders.forEach((header, colIndex) => {
        let isNumeric = true;
        let numericValues = [];
        let hasData = false;

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
            }
        }

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
                max: Math.max(...numericValues)
            });

            console.log(`Found numeric column: ${header}`);
        }
    });

    if (dropdown.children.length === 1) {
        showError("No numeric columns found in this CSV file!\n\nMake sure your CSV has:\n- A header row\n- Numeric data in at least one column\n- No empty rows\n- Proper comma separation");
        console.log("No numeric columns found. Headers:", currentHeaders);
        resetForm();
        return;
    }

    columnSection.style.display = 'block';
    sortButton.disabled = true;

    // Show data preview for first numeric column
    if (numericColumns.length > 0) {
        updateDataPreview(numericColumns[0].name);
    }
}

function updateDataPreview(columnName) {
    const dataPreview = document.getElementById('dataPreview');
    const selectedColumn = numericColumns.find(col => col.name === columnName);

    if (selectedColumn) {
        dataPreview.innerHTML = `
            <div><strong>Column:</strong> ${selectedColumn.name}</div>
            <div><strong>Sample:</strong> [${selectedColumn.sample.join(', ')}...]</div>
            <div><strong>Range:</strong> ${selectedColumn.min} to ${selectedColumn.max}</div>
            <div><strong>Total Values:</strong> ${selectedColumn.count}</div>
        `;
    }
}

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

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function resetForm() {
    document.getElementById('csvFile').value = '';
    document.getElementById('fileName').innerHTML = '<i class="fas fa-file"></i><span>No file selected</span>';
    document.getElementById('fileInfo').classList.remove('show');
    document.getElementById('uploadArea').classList.remove('active');
    document.getElementById('columnSection').style.display = 'none';
    document.getElementById('sortButton').disabled = true;
    document.getElementById('resultsSection').style.display = 'none';
    currentCSVData = null;
    currentHeaders = [];
    numericColumns = [];
}

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

    // Simulate API call for Part 1
    setTimeout(() => {
        // For Part 1, we'll simulate a response
        const mockData = {
            executionTimes: {
                'Insertion Sort': Math.floor(Math.random() * 1000) + 100,
                'Shell Sort': Math.floor(Math.random() * 800) + 80,
                'Merge Sort': Math.floor(Math.random() * 600) + 60,
                'Quick Sort': Math.floor(Math.random() * 400) + 40,
                'Heap Sort': Math.floor(Math.random() * 500) + 50
            },
            bestAlgorithm: 'Quick Sort',
            bestTime: 142
        };

        displayResults(mockData);
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-play"></i> Analyze Performance';
    }, 2000);
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
            <small>Note: This is a simulation. Connect to backend API for real analysis.</small>
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
    showSuccessMessage("Sample dataset downloaded successfully!");
}

function showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'success-summary';
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        background: var(--success);
        color: white;
        z-index: 1000;
        max-width: 300px;
        animation: slideIn 0.3s ease;
    `;

    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
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

// Add CSS animations
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
`;
document.head.appendChild(style);