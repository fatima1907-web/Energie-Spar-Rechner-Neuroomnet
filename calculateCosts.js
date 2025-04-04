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
}
module.exports =  calculateCosts ; // Exportiere die Funktion für Tests
