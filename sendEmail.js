
const emailjs = require('emailjs-com');

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
module.exports = sendEmail; // Exportiere die Funktion für Tests
