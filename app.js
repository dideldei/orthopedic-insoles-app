/**
 * Orthopädische Einlagenversorgung - Application Logic
 * 
 * This script handles the functionality for an application that helps medical professionals
 * select appropriate insole prescriptions based on orthopedic findings.
 */

// DOM Elements
const findingsListElement = document.getElementById('findings-list');
const diagnosesListElement = document.getElementById('diagnoses-list');
const insolesListElement = document.getElementById('insoles-list');
const requirementsListElement = document.getElementById('requirements-list');

// Application State
let selectedFindings = [];

/**
 * Initialize the application
 */
function initializeApp() {
    try {
        // Verify that data is available
        if (!Array.isArray(EINLAGEN_DATEN) || EINLAGEN_DATEN.length === 0) {
            throw new Error('Keine Befunddaten verfügbar. Bitte überprüfen Sie die Datei einlagen.js.');
        }

        // Populate the findings list
        populateFindingsList();

        // Initial update of the preview (will show empty state)
        updatePreview();

        console.log('Anwendung erfolgreich initialisiert.');
    } catch (error) {
        console.error('Fehler bei der Initialisierung:', error);
        showErrorMessage(error.message);
    }
}

/**
 * Populate the findings list with checkboxes
 */
function populateFindingsList() {
    // Clear existing content
    findingsListElement.innerHTML = '';

    // Sort findings alphabetically by name for better usability
    const sortedFindings = [...EINLAGEN_DATEN].sort((a, b) => 
        a.befund.localeCompare(b.befund, 'de')
    );

    // Create a checkbox for each finding
    sortedFindings.forEach(finding => {
        const findingItem = document.createElement('div');
        findingItem.className = 'finding-item';
        findingItem.innerHTML = `
            <input type="checkbox" id="finding-${finding.ID}" data-id="${finding.ID}">
            <label for="finding-${finding.ID}">${finding.befund} (${finding.icd10})</label>
        `;
        
        // Add the item to the list
        findingsListElement.appendChild(findingItem);
        
        // Add event listener to the checkbox
        const checkbox = findingItem.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', handleCheckboxChange);
    });
}

/**
 * Handle checkbox change events
 * @param {Event} event - The change event
 */
function handleCheckboxChange(event) {
    const checkbox = event.target;
    const findingId = checkbox.dataset.id;
    
    // Update the selected findings
    updateSelectedFindings();
    
    // Update the preview immediately
    updatePreview();
}

/**
 * Update the list of selected findings based on checked checkboxes
 */
function updateSelectedFindings() {
    // Get all checked checkboxes
    const checkedBoxes = findingsListElement.querySelectorAll('input[type="checkbox"]:checked');
    
    // Create array of finding IDs
    const findingIds = Array.from(checkedBoxes).map(checkbox => checkbox.dataset.id);
    
    // Get the full finding objects for selected IDs
    selectedFindings = EINLAGEN_DATEN.filter(finding => findingIds.includes(finding.ID));
}

/**
 * Update all preview sections
 */
function updatePreview() {
    updateDiagnosesPreview();
    updateInsolesPreview();
    updateRequirementsPreview();
}

/**
 * Update the diagnoses preview section
 */
function updateDiagnosesPreview() {
    if (selectedFindings.length === 0) {
        diagnosesListElement.innerHTML = '<p class="empty-message">Keine Befunde ausgewählt</p>';
        return;
    }

    diagnosesListElement.innerHTML = '';
    
    // Sort diagnoses by ICD-10 code for consistency
    const sortedDiagnoses = [...selectedFindings].sort((a, b) => 
        a.icd10.localeCompare(b.icd10)
    );
    
    // Create a list item for each diagnosis
    sortedDiagnoses.forEach(finding => {
        const diagnosisItem = document.createElement('div');
        diagnosisItem.className = 'diagnosis-item';
        diagnosisItem.innerHTML = `
            <span class="icd-code">${finding.icd10}</span>
            <span class="diagnosis-name">${finding.befund}</span>
        `;
        diagnosesListElement.appendChild(diagnosisItem);
    });
}

/**
 * Update the insoles preview section
 * Only shows insole types with the highest priority when there are duplicates
 */
function updateInsolesPreview() {
    if (selectedFindings.length === 0) {
        insolesListElement.innerHTML = '<p class="empty-message">Keine Einlagen ausgewählt</p>';
        return;
    }

    console.log("Updating insoles preview with", selectedFindings.length, "selected findings");
    
    // Get the highest priority insoles across all types
    const highestPriorityInsoles = getHighestPriorityInsoles(selectedFindings);
    
    if (highestPriorityInsoles.length === 0) {
        insolesListElement.innerHTML = '<p class="empty-message">Keine eindeutigen Einlagen identifiziert</p>';
        return;
    }

    insolesListElement.innerHTML = '';
    
    // Sort insoles by priority (highest first) then by type name
    const sortedInsoles = [...highestPriorityInsoles].sort((a, b) => {
        // First by priority (descending)
        if (b.vorrang !== a.vorrang) {
            return b.vorrang - a.vorrang;
        }
        // Then by insole type (alphabetical)
        return a.einlage_typ.localeCompare(b.einlage_typ, 'de');
    });
    
    // Create a list item for each unique insole
    sortedInsoles.forEach(insole => {
        const insoleItem = document.createElement('div');
        insoleItem.className = 'insole-item';
        
        // Set the data-priority attribute for the CSS ::after pseudo-element
        insoleItem.setAttribute('data-priority', insole.vorrang);
        
        insoleItem.innerHTML = `
            <span class="hmv-code">HMV: ${insole.hmv}</span>
            <span class="insole-type">${insole.einlage_typ}</span>
            <span class="insole-source">Basierend auf: ${insole.befund}</span>
        `;
        insolesListElement.appendChild(insoleItem);
    });
}

/**
 * Update the technical requirements preview section
 * Shows all measures for selected findings regardless of insole type
 */
function updateRequirementsPreview() {
    if (selectedFindings.length === 0) {
        requirementsListElement.innerHTML = '<p class="empty-message">Keine Erfordernisse definiert</p>';
        return;
    }

    requirementsListElement.innerHTML = '';
    
    // Create a list item for each technical requirement (measure)
    selectedFindings.forEach(finding => {
        const requirementItem = document.createElement('div');
        requirementItem.className = 'requirement-item';
        requirementItem.innerHTML = `
            <span class="requirement-text">${finding.massnahme}</span>
            <span class="requirement-source">(${finding.befund})</span>
        `;
        requirementsListElement.appendChild(requirementItem);
    });
}

/**
 * Get highest priority insoles across all types
 * @param {Array} findings - The array of selected findings
 * @returns {Array} - Array of unique insole objects with highest priority
 */
function getHighestPriorityInsoles(findings) {
    console.group('Priority System Analysis');
    console.log("🔍 Starting priority analysis with", findings ? findings.length : 0, "findings");
    
    if (!findings || findings.length === 0) {
        console.log("❌ No findings provided to priority function");
        console.groupEnd();
        return [];
    }
    
    // Log all input findings for debugging
    console.log("📋 Input findings:");
    findings.forEach(finding => {
        console.log(`   ID: ${finding.ID}, Befund: ${finding.befund}, Typ: ${finding.einlage_typ}, Vorrang: ${finding.vorrang}, HMV: ${finding.hmv}`);
    });
    
    // Filter out findings with no insole type or priority
    const validFindings = findings.filter(finding => {
        // Convert priority to number if it's a string
        if (typeof finding.vorrang === 'string') {
            finding.vorrang = parseInt(finding.vorrang, 10);
        }
        
        const isValid = finding.einlage_typ && 
                       finding.einlage_typ !== "-" && 
                       !isNaN(finding.vorrang) &&
                       finding.vorrang > 0 &&
                       finding.hmv && 
                       finding.hmv.trim() !== "";
                       
        if (!isValid) {
            console.log(`⚠️ Invalid finding: ${finding.befund} (Type: ${finding.einlage_typ}, Priority: ${finding.vorrang})`);
        }
        
        return isValid;
    });
    
    if (validFindings.length === 0) {
        console.log("❌ No valid insole findings with proper type and priority");
        console.groupEnd();
        return [];
    }

    console.log("✅ Processing", validFindings.length, "valid findings");
    
    // Step 1: Group findings by insole type
    const typeGroups = {};
    validFindings.forEach(finding => {
        const type = finding.einlage_typ;
        if (!typeGroups[type]) {
            typeGroups[type] = [];
        }
        typeGroups[type].push(finding);
    });
    
    const typeKeys = Object.keys(typeGroups);
    console.log(`📊 Grouped into ${typeKeys.length} insole types: ${typeKeys.join(', ')}`);
    
    // Step 2: For each type, find the finding with the highest priority
    console.log("🔢 Finding highest priority per insole type:");
    const highestPriorityByType = {};
    for (const type in typeGroups) {
        const findings = typeGroups[type];
        console.log(`  Type ${type} has ${findings.length} findings`);
        
        // Log all findings of this type
        findings.forEach(f => {
            console.log(`    - ${f.befund} (ID: ${f.ID}): priority ${f.vorrang}`);
        });
        
        // Ensure all vorrang values are numbers
        findings.forEach(f => {
            if (typeof f.vorrang !== 'number') {
                console.warn(`⚠️ Non-numeric priority detected: ${f.befund} has vorrang "${f.vorrang}" (${typeof f.vorrang})`);
                f.vorrang = parseInt(f.vorrang, 10) || 0;
            }
        });
        
        // Sort by priority (descending)
        findings.sort((a, b) => b.vorrang - a.vorrang);
        
        // Store the highest priority finding for this type
        highestPriorityByType[type] = findings[0];
        console.log(`  ✅ Type ${type}: highest priority is ${findings[0].vorrang} (${findings[0].befund})`);
    }
    
    // Step 3: Find the overall highest priority across all types
    const allPriorities = Object.values(highestPriorityByType).map(finding => finding.vorrang);
    const overallHighestPriority = Math.max(...allPriorities);
    console.log(`🏆 Overall highest priority across all types: ${overallHighestPriority}`);
    
    // Additional logging to compare priorities across types
    const typesAndPriorities = Object.entries(highestPriorityByType).map(([type, finding]) => ({
        type,
        priority: finding.vorrang,
        befund: finding.befund
    }));
    
    console.log('🔍 Priority comparison:');
    typesAndPriorities.forEach(item => {
        console.log(`  ${item.type}: Priority ${item.priority} (${item.befund})`);
    });
    
    // Special check for Weichbettung vs Stütze
    const weichbettung = typesAndPriorities.find(item => item.type === 'Weichbettung');
    const stuetze = typesAndPriorities.find(item => item.type === 'Stütze');
    
    if (weichbettung && stuetze) {
        console.log('⚡ DIRECT COMPARISON:');
        console.log(`  Weichbettung: Priority ${weichbettung.priority} vs Stütze: Priority ${stuetze.priority}`);
        console.log(`  Higher priority: ${weichbettung.priority > stuetze.priority ? 'Weichbettung' : 'Stütze'}`);
        console.log(`  Will keep only: ${overallHighestPriority === weichbettung.priority ? 'Weichbettung' : 'Stütze'}`);
    }
    
    // Step 4: Only keep types where their highest priority matches (not exceeds) the overall highest priority
    console.log("🔍 Filtering insole types by highest priority:");
    
    // Use filter to get only the highest priority insoles
    const finalInsoles = Object.values(highestPriorityByType).filter(finding => {
        // Explicit priority check
        const isHighestPriority = finding.vorrang === overallHighestPriority;
        
        console.log(`Priority Check for ${finding.einlage_typ}:`);
        console.log(`  - Current Priority: ${finding.vorrang}`);
        console.log(`  - Highest Priority: ${overallHighestPriority}`);
        console.log(`  - Decision: ${isHighestPriority ? 'KEEP' : 'FILTER OUT'}`);
        
        if (finding.einlage_typ === 'Weichbettung') {
            console.log(`  ⭐ Weichbettung found with priority ${finding.vorrang}`);
        } else if (finding.einlage_typ === 'Stütze') {
            console.log(`  ⭐ Stütze found with priority ${finding.vorrang}`);
        }
        
        return isHighestPriority;
    });
    
    console.log(`🎯 Final result: ${finalInsoles.length} insole types remaining`);
    finalInsoles.forEach(insole => {
        console.log(`  - ${insole.einlage_typ} (${insole.befund}): HMV ${insole.hmv}, Priority ${insole.vorrang}`);
    });
    
    console.groupEnd();
    return finalInsoles;
}

/**
 * Display an error message to the user
 * @param {string} message - The error message to display
 */
function showErrorMessage(message) {
    // Clear the findings list
    findingsListElement.innerHTML = '';
    
    // Create an error message element
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    
    // Add it to the findings list container
    findingsListElement.appendChild(errorElement);
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);

