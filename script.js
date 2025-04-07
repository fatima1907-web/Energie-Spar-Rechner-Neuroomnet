// === Globale Variablen ===
// Speichert die Liste der Geräte, die der Benutzer hinzugefügt hat.
let selectedDevices = [];
// Hält die Instanz des Diagramms, das mit Chart.js erstellt wird.
let energyChart = null;
// Speichert den Index des Geräts, das gerade bearbeitet wird. -1 = kein Gerät.
let editIndex = -1;
// Verweise auf die HTML-Elemente für Nachrichten.
const inputMessagesDiv = document.getElementById('inputMessages');
const listMessagesDiv = document.getElementById('listMessages');
const resultsMessagesDiv = document.getElementById('resultsMessages');
const globalMessagesDiv = document.getElementById('globalMessages');

// === Initialisierung beim Laden der Seite ===
// Wird ausgeführt, sobald die HTML-Seite geladen ist.
document.addEventListener("DOMContentLoaded", async () => {
    try {
        // --- EmailJS Initialisierung ---
        emailjs.init('YyYmd6k_joEe9G4sG');
    
        showLoadingMessage("Lade Geräteliste...");

        // Geräte aus JSON laden
        const response = await fetch("devices.json");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Dropdown füllen
        const deviceSelect = document.getElementById("deviceSelect");
        const customOption = document.createElement("option");
        customOption.value = "custom";
        customOption.textContent = "-- Eigene Angaben --";
        deviceSelect.appendChild(customOption);
        data.devices.forEach(device => {
            const option = document.createElement("option");
            option.value = device.watt;
            option.dataset.deviceName = device.name;
            option.textContent = `${device.name} (${device.watt} W)`;
            deviceSelect.appendChild(option);
        });

        // Event Listener hinzufügen
        deviceSelect.addEventListener('change', handleDeviceSelectChange);

        hideLoadingMessage();

        // Gespeicherte Daten laden und UI aktualisieren
        loadSavedDevices();
        updateDeviceList();
        addTooltips();
        updateChart(parseInt(document.getElementById('calculationYears').value) || 5, 0, 0); // Leeres Initial-Chart

    } catch (error) {
        console.error("Fehler beim Laden der Initialisierungsdaten:", error);
        // Zeige Fehler auch an, wenn EmailJS Init fehlschlägt (falls Key falsch etc.)
        if (error.text && typeof error.text === 'string' && error.text.includes('Public Key')) {
            showGlobalErrorMessage(`Fehler bei EmailJS Initialisierung: Ungültiger Public Key. Bitte Konfiguration in script.js prüfen.`);
        } else if (error instanceof TypeError && error.message.includes('emailjs is not defined')) {
             showGlobalErrorMessage(`Fehler: EmailJS SDK konnte nicht geladen werden. Prüfen Sie die Internetverbindung und den Link im HTML.`);
        } else {
            showGlobalErrorMessage("Fehler beim Laden der Geräteliste. Bitte die Seite neu laden.");
        }
        hideLoadingMessage();
    }
});

// === Funktion zur Behandlung von Dropdown-Änderungen ===
// Aktualisiert die Eingabefelder basierend auf der Dropdown-Auswahl.
function handleDeviceSelectChange() {
    const deviceSelect = document.getElementById("deviceSelect");
    const deviceNameInput = document.getElementById("deviceName");
    const devicePowerInput = document.getElementById("devicePower");

    clearMessages(inputMessagesDiv); // Alte Nachrichten löschen

    if (deviceSelect.value === "custom") {
        // Eigene Angaben: Felder aktivieren und leeren
        deviceNameInput.disabled = false;
        devicePowerInput.disabled = false;
        deviceNameInput.value = "";
        devicePowerInput.value = "";
        deviceNameInput.placeholder = "z.B. Mein Laptop";
        devicePowerInput.placeholder = "Watt eingeben";
    } else if (deviceSelect.value) {
        // Vordefiniertes Gerät: Felder deaktivieren und füllen
        deviceNameInput.disabled = true;
        devicePowerInput.disabled = true;
        const selectedOption = deviceSelect.options[deviceSelect.selectedIndex];
        deviceNameInput.value = selectedOption.dataset.deviceName || ''; // Namen aus data-Attribut
        devicePowerInput.value = selectedOption.value; // Watt aus value
    } else {
        // "-- Gerät auswählen --": Felder deaktivieren und leeren
        deviceNameInput.disabled = true;
        devicePowerInput.disabled = true;
        deviceNameInput.value = "";
        devicePowerInput.value = "";
        deviceNameInput.placeholder = "Gerätename eingeben";
        devicePowerInput.placeholder = "Watt eingeben";
    }
}

// === Funktion zum Hinzufügen von Tooltips ===
function addTooltips() {
    const tooltipsData = [
        { id: "deviceSelect", text: "Wählen Sie ein vordefiniertes Gerät oder 'Eigene Angaben' für manuelle Eingabe." },
        { id: "deviceName", text: "Name des Geräts (wird bei Auswahl automatisch gefüllt oder manuell eingegeben)." },
        { id: "devicePower", text: "Stromverbrauch des Geräts in Watt (W)."},
        { id: "deviceCount", text: "Anzahl identischer Geräte dieses Typs." },
        { id: "usageHours", text: "Durchschnittliche tägliche Nutzungsdauer in Stunden (0-24)." },
        { id: "usageDays", text: "Anzahl der Nutzungstage pro Woche (1-7)." },
        { id: "usageWeeks", text: "Anzahl der Nutzungswochen pro Jahr (0-52)." },
        { id: "electricityPrice", text: "Ihr Strompreis in Cent pro Kilowattstunde (kWh)." },
        { id: "calculationYears", text: "Zeitraum in Jahren für die kumulierte Kostendarstellung im Diagramm (1-20)." }
    ];
    tooltipsData.forEach(item => {
        const element = document.getElementById(item.id);
        const label = document.querySelector(`label[for='${item.id}']`);
        if (label && element) {
            const tooltipSpan = document.createElement("span");
            tooltipSpan.className = "tooltip";
            tooltipSpan.innerHTML = " ℹ️";
            const tooltipText = document.createElement("span");
            tooltipText.className = "tooltip-text";
            tooltipText.textContent = item.text;
            tooltipSpan.appendChild(tooltipText);
            label.appendChild(tooltipSpan);
        } else {
             console.warn(`Label for element with id '${item.id}' not found for tooltip.`);
        }
    });
}

// === Funktionen zur Nachrichten-Anzeige ===
// Löscht Nachrichten in einem Container.
function clearMessages(container) {
    if (container) {
        container.innerHTML = '';
    }
}

// Zeigt eine Nachricht an (mit Typ für Styling).
function showMessage(container, message, type) {
    if (!container) return;
    clearMessages(container);
    const notificationDiv = document.getElementById('resultsMessages');
    if (!notificationDiv) return;

    const typeColors = {
        success: '#3c763d',
        error: '#a94442',
        info: '#31708f'
    };

    notificationDiv.innerText = message;
    notificationDiv.style.display = 'block';
    notificationDiv.style.backgroundColor = typeColors[type] || '#31708f'; // default zu info

    setTimeout(() => {
        notificationDiv.style.display = 'none';
    }, 5000);
}
// Hilfsfunktionen für verschiedene Nachrichtentypen.
function showSuccessMessage(container, message) { showMessage(container, message, 'success'); }
function showErrorMessage(container, message) { showMessage(container, message, 'error'); }
function showGlobalErrorMessage(message) { showMessage(globalMessagesDiv, message, 'error'); }
function showLoadingMessage(message) { showMessage(globalMessagesDiv, message, 'info'); }
// Versteckt die Lade-Nachricht.
function hideLoadingMessage() {
     const infoMsg = globalMessagesDiv.querySelector('.info-message');
     if (infoMsg && infoMsg.textContent.includes('Lade')) {
         clearMessages(globalMessagesDiv);
     }
}

// === Funktionen für Local Storage ===
// Lädt gespeicherte Geräte.
function loadSavedDevices() {
    const savedDevices = localStorage.getItem("energyCalculatorDevices");
    if (savedDevices) {
        try {
            selectedDevices = JSON.parse(savedDevices);
            if (!Array.isArray(selectedDevices)) {
                 selectedDevices = [];
                 throw new Error("Stored data is not an array.");
            }
        } catch (e) {
            console.error("Fehler beim Laden der gespeicherten Geräte:", e);
            localStorage.removeItem("energyCalculatorDevices");
            selectedDevices = [];
             showErrorMessage(listMessagesDiv, "Gespeicherte Gerätedaten waren ungültig und wurden zurückgesetzt.");
        }
    }
}
// Speichert aktuelle Geräte.
function saveDevicesToStorage() {
    try {
        localStorage.setItem("energyCalculatorDevices", JSON.stringify(selectedDevices));
    } catch (e) {
        console.error("Fehler beim Speichern der Geräte:", e);
        showErrorMessage(listMessagesDiv, "Geräte konnten nicht gespeichert werden (möglicherweise Speicher voll?).");
    }
}

// === Funktionen zur Geräteverwaltung ===
// Fügt ein Gerät hinzu oder aktualisiert es.
function addDevice() {
    clearMessages(inputMessagesDiv);
    const deviceSelect = document.getElementById("deviceSelect");
    const deviceNameInput = document.getElementById("deviceName");
    const devicePowerInput = document.getElementById("devicePower");
    const deviceCountInput = document.getElementById("deviceCount");
    const usageHoursInput = document.getElementById("usageHours");
    const usageDaysInput = document.getElementById("usageDays");
    const usageWeeksInput = document.getElementById("usageWeeks");

    // Werte auslesen
    const deviceName = deviceNameInput.value.trim();
    const devicePower = devicePowerInput.value;
    const deviceCount = parseInt(deviceCountInput.value);
    const usageHours = parseFloat(usageHoursInput.value);
    const usageDays = parseInt(usageDaysInput.value);
    const usageWeeks = parseInt(usageWeeksInput.value);

    let name, watt;

    // Validierung
    if (deviceSelect.value === "custom") {
        if (!deviceName) return showErrorMessage(inputMessagesDiv, "Bitte geben Sie einen Gerätenamen ein.");
        if (!devicePower) return showErrorMessage(inputMessagesDiv, "Bitte geben Sie die Wattzahl ein.");
        name = deviceName;
        watt = parseInt(devicePower);
    } else if (deviceSelect.value) {
        const selectedOption = deviceSelect.options[deviceSelect.selectedIndex];
        name = selectedOption.dataset.deviceName;
        watt = parseInt(selectedOption.value);
    } else {
        return showErrorMessage(inputMessagesDiv, "Bitte wählen Sie ein Gerät aus oder geben Sie eigene Daten ein.");
    }
    if (isNaN(watt) || watt <= 0) return showErrorMessage(inputMessagesDiv, "Ungültige Wattzahl. Muss eine positive Zahl sein.");
    if (isNaN(deviceCount) || deviceCount < 1) return showErrorMessage(inputMessagesDiv, "Anzahl der Geräte muss mindestens 1 sein.");
    if (isNaN(usageHours) || usageHours < 0 || usageHours > 24) return showErrorMessage(inputMessagesDiv, "Stunden/Tag müssen zwischen 0 und 24 liegen.");
    if (isNaN(usageDays) || usageDays < 1 || usageDays > 7) return showErrorMessage(inputMessagesDiv, "Tage/Woche müssen zwischen 1 und 7 liegen.");
    if (isNaN(usageWeeks) || usageWeeks < 0 || usageWeeks > 52) return showErrorMessage(inputMessagesDiv, "Wochen/Jahr müssen zwischen 0 und 52 liegen.");

    // Gerät erstellen/aktualisieren
    const newDevice = {
        id: editIndex >= 0 ? selectedDevices[editIndex].id : Date.now(),
        name: name, watt: watt, count: deviceCount, hours: usageHours, days: usageDays, weeks: usageWeeks
    };
    if (editIndex >= 0) {
        selectedDevices[editIndex] = newDevice;
        showSuccessMessage(inputMessagesDiv, `"${name}" wurde erfolgreich aktualisiert!`);
        editIndex = -1;
    } else {
        selectedDevices.push(newDevice);
        showSuccessMessage(inputMessagesDiv, `"${name}" wurde erfolgreich hinzugefügt!`);
    }

    // Aufräumen
    resetInputFields();
    updateDeviceList();
    saveDevicesToStorage();
}
// Setzt Eingabefelder zurück.

function resetInputFields() {
    document.getElementById("deviceSelect").selectedIndex = 0;
    handleDeviceSelectChange();
    document.getElementById("deviceCount").value = "1";
    document.getElementById("usageHours").value = "6";
    document.getElementById("usageDays").value = "5";
    document.getElementById("usageWeeks").value = "45";
    document.getElementById("addDeviceButton").textContent = "Hinzufügen";
    editIndex = -1;
}
// Aktualisiert die HTML-Geräteliste.
function updateDeviceList() {
    const deviceListUl = document.getElementById("deviceList");
    const noDevicesMessage = document.getElementById("noDevicesMessage");
    clearMessages(listMessagesDiv);
    deviceListUl.innerHTML = "";

    if (selectedDevices.length === 0) {
        noDevicesMessage.style.display = "block";
        document.getElementById("resetButton").style.display = 'none';
    } else {
        noDevicesMessage.style.display = "none";
        document.getElementById("resetButton").style.display = 'block';
        selectedDevices.forEach((device, index) => {
            const li = document.createElement("li");
            li.innerHTML = `
                <span>${device.count}x ${device.name} (${device.watt} W) - ${device.hours}h/${device.days}d/${device.weeks}w</span>
                <div class="device-actions">
                    <button class="edit-button" onclick="editDevice(${index})" title="Gerät bearbeiten">✏️</button>
                    <button class="remove-button" onclick="removeDevice(${index})" title="Gerät entfernen">❌</button>
                </div>
            `;
            deviceListUl.appendChild(li);
        });
    }
}
// Entfernt ein Gerät.
function removeDevice(index) {
     if (index >= 0 && index < selectedDevices.length) {
         const deviceName = selectedDevices[index].name;
        if (confirm(`Möchten Sie "${deviceName}" wirklich aus der Liste entfernen?`)) {
            selectedDevices.splice(index, 1);
            updateDeviceList();
            saveDevicesToStorage();
            showSuccessMessage(listMessagesDiv, `"${deviceName}" wurde entfernt.`);
        }
     }
}
// Bereitet Formular zum Bearbeiten vor.
function editDevice(index) {
    if (index >= 0 && index < selectedDevices.length) {
        const device = selectedDevices[index];
        editIndex = index;
        clearMessages(inputMessagesDiv);
        const deviceSelect = document.getElementById("deviceSelect");
        let foundInSelect = false;
        for (let i = 0; i < deviceSelect.options.length; i++) {
            if (deviceSelect.options[i].dataset.deviceName === device.name && parseInt(deviceSelect.options[i].value) === device.watt) {
                deviceSelect.selectedIndex = i;
                foundInSelect = true;
                break;
            }
        }
        if (!foundInSelect) { deviceSelect.value = "custom"; }
        handleDeviceSelectChange();
        document.getElementById("deviceName").value = device.name;
        document.getElementById("devicePower").value = device.watt;
        document.getElementById("deviceCount").value = device.count;
        document.getElementById("usageHours").value = device.hours;
        document.getElementById("usageDays").value = device.days;
        document.getElementById("usageWeeks").value = device.weeks;
        document.getElementById("addDeviceButton").textContent = "Aktualisieren";
        document.querySelector('.input-section').scrollIntoView({ behavior: 'smooth' });
    }
}
// Setzt die gesamte Liste und Ergebnisse zurück.
function resetDevices() {
    if (confirm("Möchten Sie wirklich alle Geräte aus der Liste entfernen?")) {
        selectedDevices = [];
        editIndex = -1;
        resetInputFields();
        updateDeviceList();
        saveDevicesToStorage();
        showSuccessMessage(listMessagesDiv, "Alle Geräte wurden entfernt.");
        document.getElementById("costs365").textContent = "0";
        document.getElementById("optimizedCosts").textContent = "0";
        document.getElementById("savings").textContent = "0";
        document.getElementById("savingsPercentage").textContent = "0";
        document.getElementById("co2Savings").textContent = "0";
        updateChart(parseInt(document.getElementById('calculationYears').value) || 5, 0, 0);
    }
}

// === Berechnung und Ergebnis-Anzeige ===
// Berechnet Kosten und CO2.
function calculateCosts() {
    clearMessages(resultsMessagesDiv);
    const electricityPriceInput = document.getElementById("electricityPrice");
    const calculationYearsInput = document.getElementById("calculationYears");
    const electricityPriceCent = parseFloat(electricityPriceInput.value);
    const calculationYears = parseInt(calculationYearsInput.value);

    // Validierung
    if (selectedDevices.length === 0) return showErrorMessage(resultsMessagesDiv, "Keine Geräte hinzugefügt. Bitte fügen Sie zuerst Geräte hinzu.");
    if (isNaN(electricityPriceCent) || electricityPriceCent <= 0) return showErrorMessage(resultsMessagesDiv, "Ungültiger Strompreis. Muss eine positive Zahl sein.");
    if (isNaN(calculationYears) || calculationYears < 1 || calculationYears > 20) return showErrorMessage(resultsMessagesDiv, "Ungültiger Berechnungszeitraum. Muss zwischen 1 und 20 Jahren liegen.");

    const electricityPriceEuro = electricityPriceCent / 100;
    let totalAnnualKWhOptimized = 0;
    let totalAnnualKWh247 = 0;

    // Jährlichen Verbrauch berechnen
    selectedDevices.forEach(device => {
        const totalWatt = device.watt * device.count;
        totalAnnualKWhOptimized += (totalWatt * device.hours * device.days * device.weeks) / 1000;
        totalAnnualKWh247 += (totalWatt * 24 * 365) / 1000;
    });

    // Jährliche Kosten und Einsparungen
    const costAnnualOptimized = totalAnnualKWhOptimized * electricityPriceEuro;
    const costAnnual247 = totalAnnualKWh247 * electricityPriceEuro;
    const savingsAnnual = costAnnual247 - costAnnualOptimized;
    const savingsPercentage = costAnnual247 > 0 ? ((savingsAnnual / costAnnual247) * 100) : 0;
    const co2Factor = 0.401;
    const co2SavingsAnnual = (totalAnnualKWh247 - totalAnnualKWhOptimized) * co2Factor;

    // Ergebnisse anzeigen (jährlich)
    document.getElementById("costs365").textContent = costAnnual247.toFixed(2);
    document.getElementById("optimizedCosts").textContent = costAnnualOptimized.toFixed(2);
    document.getElementById("savings").textContent = savingsAnnual.toFixed(2);
    document.getElementById("savingsPercentage").textContent = Math.max(0, savingsPercentage).toFixed(1);
    document.getElementById("co2Savings").textContent = Math.max(0, co2SavingsAnnual).toFixed(2);

    // Diagramm aktualisieren
    document.getElementById("chartYears").textContent = calculationYears;
    updateChart(calculationYears, costAnnual247, costAnnualOptimized);
    showSuccessMessage(resultsMessagesDiv, "Berechnung erfolgreich durchgeführt.");

    // Danach Buttons aktivieren, wenn gültig
    activateExportButtonsIfValid();
}
// Aktualisiert das Chart.js-Diagramm.
function updateChart(years, annualCost247, annualCostOptimized) {
    const ctx = document.getElementById("energyChart").getContext("2d");
    if (energyChart) { energyChart.destroy(); }

    const currentYear = new Date().getFullYear();
    const labels = Array.from({ length: years }, (_, i) => currentYear + i);
    const cumulativeCost247 = [];
    const cumulativeCostOptimized = [];
    const cumulativeSavings = [];

    // Kumulierte Werte berechnen
    for (let i = 1; i <= years; i++) {
        cumulativeCost247.push(annualCost247 * i);
        cumulativeCostOptimized.push(annualCostOptimized * i);
        cumulativeSavings.push((annualCost247 - annualCostOptimized) * i);
    }

    // Chart erstellen
    energyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Kumulierte Kosten Dauerbetrieb (24/7)',
                    data: cumulativeCost247,
                    backgroundColor: 'rgba(220, 53, 69, 0.7)', // Rot
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 1, order: 2
                },
                {
                    label: 'Ihre kumulierten Kosten (Optimiert)',
                    data: cumulativeCostOptimized,
                    backgroundColor: 'rgba(0, 123, 255, 0.7)', // Blau
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 1, order: 3
                },
                {
                    label: 'Kumulierte Ersparnis',
                    data: cumulativeSavings,
                    borderColor: '#28a745', // Grün
                    borderWidth: 3, type: 'line', fill: false, tension: 0.1,
                    pointRadius: 4, pointBackgroundColor: '#28a745', order: 1
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true, title: { display: true, text: 'Kumulierte Kosten in €' },
                    ticks: { callback: value => value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' }) }
                },
                x: { title: { display: true, text: 'Jahr' } }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: context => {
                            let label = context.dataset.label || '';
                            if (label) { label += ': '; }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
                            }
                            return label;
                        }
                    }
                },
                legend: { position: 'bottom' }
            }
        }
    });
}

// === Export-Funktionen ===

// --- sendEmail Funktion mit EmailJS ---
function sendEmail() {
    clearMessages(resultsMessagesDiv);
    const savingsValue = document.getElementById("savings").textContent;

    // Prüfen ob Berechnung erfolgte
    if (savingsValue === "0" || !document.getElementById("costs365").textContent || document.getElementById("costs365").textContent === "0") {
        return showErrorMessage(resultsMessagesDiv, "Bitte führen Sie zuerst eine Berechnung durch, bevor Sie die Ergebnisse senden.");
    }

    // 1. E-Mail-Adresse des Empfängers abfragen
    const userEmail = prompt("Bitte geben Sie Ihre E-Mail-Adresse ein, an die die Ergebnisse gesendet werden sollen:", "");
    if (!userEmail) {
        showErrorMessage(resultsMessagesDiv, "E-Mail-Versand abgebrochen: Keine E-Mail-Adresse angegeben.");
        return;
    }
    if (!/\S+@\S+\.\S+/.test(userEmail)) { // Einfache Validierung
         showErrorMessage(resultsMessagesDiv, "Ungültige E-Mail-Adresse eingegeben.");
         return;
    }

    // 2. Daten für das EmailJS Template vorbereiten
    // Die Schlüssel hier MÜSSEN exakt den {{variablen}} in deinem EmailJS Template entsprechen!
    const templateParams = {
        reply_to: userEmail,
        to_email: userEmail,
        cost_24h: document.getElementById("costs365").textContent,
        optimized_cost: document.getElementById("optimizedCosts").textContent,
        savings_amount: document.getElementById("savings").textContent,
        savings_percent: document.getElementById("savingsPercentage").textContent,
        co2_savings: document.getElementById("co2Savings").textContent,
        calc_years: document.getElementById("calculationYears").value,
        electricity_price: document.getElementById("electricityPrice").value,
        device_list: selectedDevices.map(d => `- ${d.count}x ${d.name} (${d.watt}W, ${d.hours}h/${d.days}d/${d.weeks}w)`).join('\n'),
        source_url: window.location.href
    };

    // 3. EmailJS Sende-Funktion aufrufen
    // WICHTIG: Ersetze PLATZHALTER durch deine IDs von EmailJS!
    const serviceID = 'service_m17w6ge';   // Finde sie unter Email Services
    const templateID = 'template_28umko8'; // Finde sie unter Email Templates

    showMessage(resultsMessagesDiv, 'Sende E-Mail...', 'info'); // "Sende..." Nachricht

    emailjs.send(serviceID, templateID, templateParams)
        .then(response => {
            // Erfolg
            console.log('EmailJS SUCCESS!', response.status, response.text);
            showSuccessMessage(resultsMessagesDiv, `Ergebnisse erfolgreich an ${userEmail} gesendet!`);
        }, error => {
            // Fehler
            console.error('EmailJS FAILED...', error);
            let errorMsg = "Fehler beim Senden der E-Mail.";
             if (error && typeof error === 'object' && error.text) { // Prüfe ob error und error.text existieren
                 errorMsg += ` (${error.text})`;
             } else if (error && typeof error === 'object' && error.status) {
                 errorMsg += ` (Status: ${error.status})`;
             } else if (typeof error === 'string') {
                 errorMsg += ` (${error})`;
             }
             // Spezifische Fehler für falsche IDs abfangen
             if (errorMsg.includes("service_id is invalid") || errorMsg.includes("template_id is invalid") || errorMsg.includes("user_id is invalid")) {
                 errorMsg += " Bitte überprüfen Sie Ihre EmailJS-Konfiguration (Service ID, Template ID, Public Key) in script.js.";
             }
            showErrorMessage(resultsMessagesDiv, errorMsg);
        });
}

// --- Druckfunktion ---
// Generiert Druckansicht und öffnet Druckdialog.
function printResults() {
     clearMessages(resultsMessagesDiv);
     const savingsValue = document.getElementById("savings").textContent;
     // Prüfen ob Berechnung erfolgte
     if (savingsValue === "0" || !document.getElementById("costs365").textContent || document.getElementById("costs365").textContent === "0") {
        return showErrorMessage(resultsMessagesDiv, "Bitte führen Sie zuerst eine Berechnung durch, um Ergebnisse zu drucken.");
    }
    const resultsHTML = document.querySelector('.results').innerHTML;
    const chartImage = energyChart ? energyChart.toBase64Image() : null;
    const calculationYears = document.getElementById("calculationYears").value;
    const electricityPrice = document.getElementById("electricityPrice").value;
    let deviceListHTML = '<ul>';
    if (selectedDevices.length > 0) {
        selectedDevices.forEach(device => {
            deviceListHTML += `<li>${device.count}x ${device.name} (${device.watt} W) - ${device.hours}h/${device.days}d/${device.weeks}w</li>`;
        });
    } else {
        deviceListHTML += '<li>Keine Geräte hinzugefügt</li>';
    }
    deviceListHTML += '</ul>';
    // Druckfenster öffnen und befüllen
    const printWindow = window.open('', '_blank', 'height=600,width=800');
    printWindow.document.write(`
        <html>
        <head>
            <title>Druckansicht - Energie-Spar-Rechner</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.4; }
                h1, h2, h3 { color: #0056b3; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 15px;}
                .results-section p { margin: 8px 0; }
                .results-section .highlight { font-weight: bold; color: #28a745; }
                .eco-impact .co2-source { font-size: 0.8em; color: #6c757d; display: block; margin-top: 3px; }
                .device-list-section ul { list-style: disc; padding-left: 25px; }
                .chart-section img { max-width: 100%; height: auto; border: 1px solid #ccc; margin-top: 10px; }
                footer { margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 10px; }
            </style>
        </head>
        <body>
            <h1>Energie-Spar-Rechner Ergebnisse</h1>
            <div class="results-section">${resultsHTML}<p>Strompreis: ${electricityPrice} Cent/kWh</p></div>
            <div class="device-list-section"><h2>Berücksichtigte Geräte</h2>${deviceListHTML}</div>
            ${chartImage ? `<div class="chart-section"><h2>Kumulierter Kostenverlauf (${calculationYears} Jahre)</h2><img src="${chartImage}" alt="Kostenverlauf Diagramm"></div>` : ''}
            <footer>Erstellt mit dem Energie-Spar-Rechner am ${new Date().toLocaleDateString('de-DE')} ${new Date().toLocaleTimeString('de-DE')}<br> Quelle: ${window.location.origin + window.location.pathname}</footer>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    // Kurze Verzögerung vor dem Drucken
    setTimeout(() => {
         try {
            printWindow.print();
         } catch (e) {
             console.error("Printing failed:", e);
             printWindow.alert("Drucken fehlgeschlagen. Bitte versuchen Sie es über das Browsermenü.");
         }
    }, 750);
}

function activateExportButtonsIfValid() {
    const savings = document.getElementById("savings").textContent;
    const costs365 = document.getElementById("costs365").textContent;

    const buttonsEnabled = savings !== "0" && costs365 && costs365 !== "0";
    
    document.getElementById("sendEmailBtn").disabled = !buttonsEnabled;
    document.getElementById("printResultsBtn").disabled = !buttonsEnabled;
}
