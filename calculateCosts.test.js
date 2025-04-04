const calculateCosts = require('./calculateCosts');
global.clearMessages = jest.fn();
global.showErrorMessage = jest.fn();
global.showSuccessMessage = jest.fn();
global.updateChart = jest.fn();
global.selectedDevices = []; // Initial leer

describe('calculateCosts Function', () => {

    // beforeEach wird vor jedem Test ausgeführt
    beforeEach(() => {
        
        document.body.innerHTML = `
            <div>
                <input id="electricityPrice" value="30">
                <input id="calculationYears" value="5">
                <div id="resultsMessagesDiv"></div>
                <span id="costs365">0</span>
                <span id="optimizedCosts">0</span>
                <span id="savings">0</span>
                <span id="savingsPercentage">0</span>
                <span id="co2Savings">0</span>
                <span id="chartYears">0</span>
                <div id="listMessagesDiv"></div>
            </div>
            <canvas id="energyChart"></canvas>
        `;

        clearMessages.mockClear();
        showErrorMessage.mockClear();
        showSuccessMessage.mockClear();
        updateChart.mockClear();

        global.selectedDevices = [];
    });

    test('Sollte Fehler anzeigen, wenn keine Geräte hinzugefügt wurden', () => {
        calculateCosts(); 
        expect(clearMessages).toHaveBeenCalledWith(document.getElementById('resultsMessagesDiv'));
        expect(showErrorMessage).toHaveBeenCalledTimes(1);
        expect(showErrorMessage).toHaveBeenCalledWith(
            document.getElementById('resultsMessagesDiv'),
            "Keine Geräte hinzugefügt. Bitte fügen Sie zuerst Geräte hinzu."
        );
        expect(showSuccessMessage).not.toHaveBeenCalled();
        expect(updateChart).not.toHaveBeenCalled();
    });

    test('Sollte Fehler anzeigen bei ungültigem Strompreis (<= 0)', () => {
        global.selectedDevices = [{ watt: 50, count: 1, hours: 2, days: 5, weeks: 40, name: 'Test' }]; // Füge ein Gerät hinzu
        document.getElementById('electricityPrice').value = '-10'; // Ungültiger Preis
        calculateCosts();
        expect(showErrorMessage).toHaveBeenCalledTimes(1);
        expect(showErrorMessage).toHaveBeenCalledWith(
            document.getElementById('resultsMessagesDiv'),
            "Ungültiger Strompreis. Muss eine positive Zahl sein."
        );
        expect(showSuccessMessage).not.toHaveBeenCalled();
    });

     test('Sollte Fehler anzeigen bei ungültigem Strompreis (NaN)', () => {
        global.selectedDevices = [{ watt: 50, count: 1, hours: 2, days: 5, weeks: 40, name: 'Test' }];
        document.getElementById('electricityPrice').value = 'abc'; // Ungültiger Preis
        calculateCosts();
        expect(showErrorMessage).toHaveBeenCalledTimes(1);
        expect(showErrorMessage).toHaveBeenCalledWith(
            document.getElementById('resultsMessagesDiv'),
            "Ungültiger Strompreis. Muss eine positive Zahl sein."
        );
    });

    test('Sollte Fehler anzeigen bei ungültigem Berechnungszeitraum (< 1)', () => {
        global.selectedDevices = [{ watt: 50, count: 1, hours: 2, days: 5, weeks: 40, name: 'Test' }];
        document.getElementById('calculationYears').value = '0'; // Ungültige Jahre
        calculateCosts();
        expect(showErrorMessage).toHaveBeenCalledTimes(1);
        expect(showErrorMessage).toHaveBeenCalledWith(
            document.getElementById('resultsMessagesDiv'),
            "Ungültiger Berechnungszeitraum. Muss zwischen 1 und 20 Jahren liegen."
        );
    });

     test('Sollte Fehler anzeigen bei ungültigem Berechnungszeitraum (> 20)', () => {
        global.selectedDevices = [{ watt: 50, count: 1, hours: 2, days: 5, weeks: 40, name: 'Test' }];
        document.getElementById('calculationYears').value = '21'; // Ungültige Jahre
        calculateCosts();
        expect(showErrorMessage).toHaveBeenCalledTimes(1);
        expect(showErrorMessage).toHaveBeenCalledWith(
            document.getElementById('resultsMessagesDiv'),
            "Ungültiger Berechnungszeitraum. Muss zwischen 1 und 20 Jahren liegen."
        );
    });
    test('Sollte Kosten und Einsparungen korrekt berechnen und anzeigen', () => {
        // Beispielgerät(e)
        global.selectedDevices = [
            { name: 'Laptop', watt: 50, count: 1, hours: 8, days: 5, weeks: 45 }, // 50W * 8h/d * 5d/w * 45w/y = 90000 Wh/y = 90 kWh/y
            { name: 'Monitor', watt: 30, count: 1, hours: 8, days: 5, weeks: 45 }  // 30W * 8h/d * 5d/w * 45w/y = 54000 Wh/y = 54 kWh/y
        ];
        document.getElementById('electricityPrice').value = '40'; // 40 Cent/kWh
        document.getElementById('calculationYears').value = '3'; // 3 Jahre

        calculateCosts();

        // Erwartete Werte
        const expectedKWhOptimized = 90 + 54; // 144 kWh/y
        const expectedKWh247_Laptop = (50 * 1 * 24 * 365) / 1000; // 438 kWh/y
        const expectedKWh247_Monitor = (30 * 1 * 24 * 365) / 1000; // 262.8 kWh/y
        const expectedKWh247 = expectedKWh247_Laptop + expectedKWh247_Monitor; // 700.8 kWh/y
        const priceEuro = 40 / 100; // 0.40 €/kWh
        const expectedCostOptimized = expectedKWhOptimized * priceEuro; // 144 * 0.40 = 57.60 €
        const expectedCost247 = expectedKWh247 * priceEuro; // 700.8 * 0.40 = 280.32 €
        const expectedSavings = expectedCost247 - expectedCostOptimized; // 280.32 - 57.60 = 222.72 €
        const expectedSavingsPerc = (expectedSavings / expectedCost247) * 100; // (222.72 / 280.32) * 100 = 79.45... %
        const expectedCO2Savings = (expectedKWh247 - expectedKWhOptimized) * 0.401; // (700.8 - 144) * 0.401 = 556.8 * 0.401 = 223.2768 kg

        // Überprüfe, ob keine Fehlermeldung angezeigt wurde
        expect(showErrorMessage).not.toHaveBeenCalled();

        // Überprüfe, ob die Ergebnis-Elemente korrekt befüllt wurden
        expect(document.getElementById('costs365').textContent).toBe(expectedCost247.toFixed(2)); // "280.32"
        expect(document.getElementById('optimizedCosts').textContent).toBe(expectedCostOptimized.toFixed(2)); // "57.60"
        expect(document.getElementById('savings').textContent).toBe(expectedSavings.toFixed(2)); // "222.72"
        expect(document.getElementById('savingsPercentage').textContent).toBe(expectedSavingsPerc.toFixed(1)); // "79.5"
        expect(document.getElementById('co2Savings').textContent).toBe(expectedCO2Savings.toFixed(2)); // "223.28"
        expect(document.getElementById('chartYears').textContent).toBe('3');

        // Überprüfe, ob updateChart korrekt aufgerufen wurde
        expect(updateChart).toHaveBeenCalledTimes(1);

        // Prüfe die Argumente genauer (Achtung: Floats können ungenau sein, evtl. toBeCloseTo verwenden)
        expect(updateChart).toHaveBeenCalledWith(3, expectedCost247, expectedCostOptimized);

        // Überprüfe, ob Erfolgsmeldung angezeigt wurde

        expect(showSuccessMessage).toHaveBeenCalledTimes(1);
        expect(showSuccessMessage).toHaveBeenCalledWith(
            document.getElementById('resultsMessagesDiv'),
            "Berechnung erfolgreich durchgeführt."
        );
    });
  
});
