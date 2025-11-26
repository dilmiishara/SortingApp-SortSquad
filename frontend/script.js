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


function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(new Error("Failed to read file"));
        reader.readAsText(file);
    });
}