const sendEmail = require('./sendEmail'); 
jest.mock('emailjs-com', () => ({
    send: jest.fn(() => Promise.resolve({ status: 200, text: 'OK' })), // Standardverhalten für erfolgreiche Tests
    init: jest.fn(), 
}));

const emailjs = require('emailjs-com');

describe('sendEmail Function', () => {

    beforeEach(() => {
        document.body.innerHTML = `
            <div>
                <span id="savings">123.45</span>
                <span id="costs365">500.00</span>
                <span id="optimizedCosts">376.55</span>
                <span id="savingsPercentage">24.7</span>
                <span id="co2Savings">50.00</span>
                <input id="calculationYears" value="5">
                <input id="electricityPrice" value="30">
                <div id="resultsMessagesDiv"></div>
            </div>
        `;
   
        global.selectedDevices = [{ name: 'Test Device', count: 1, watt: 50, hours: 8, days: 5, weeks: 50 }];
        global.prompt = jest.fn().mockReturnValue('test@example.com');
        global.showErrorMessage = jest.fn();
        global.showSuccessMessage = jest.fn();
        global.showMessage = jest.fn();
        global.clearMessages = jest.fn();


        emailjs.send.mockClear();
        global.prompt.mockClear();
        global.showErrorMessage.mockClear();
        global.showSuccessMessage.mockClear();
        global.showMessage.mockClear();
        global.clearMessages.mockClear();
    });

    // --- Test 1: Erfolgsfall ---
    test('should ask for email and call emailjs.send with correct parameters', async () => {
        await sendEmail(); 
        // 1. Stelle sicher, dass die Vorbedingungen erfüllt sind
        expect(global.prompt).toHaveBeenCalledTimes(1);

        // 2. Prüfe, ob emailjs.send genau EINMAL aufgerufen wurde
        expect(emailjs.send).toHaveBeenCalledTimes(1);

        // 3. Hole die Argumente des ersten (und einzigen) Aufrufs
        const actualArgs = emailjs.send.mock.calls[0];

        // 4. Prüfe die Argumente einzeln
        expect(actualArgs[0]).toBe('service_m17w6ge');      // Argument 1: Service ID
        expect(actualArgs[1]).toBe('template_28umko8');    // Argument 2: Template ID
        expect(actualArgs[2]).toBeInstanceOf(Object);       // Argument 3: Ist es ein Objekt?
        expect(actualArgs[2]).not.toBeNull();              // Argument 3: Ist es nicht null?
        expect(actualArgs[3]).toBeUndefined();             // Argument 4: Ist es undefined?

        // 5. Prüfe spezifische Eigenschaften des Parameter-Objekts (Argument 3)
        const actualTemplateParams = actualArgs[2];
        expect(actualTemplateParams).toHaveProperty('to_email', 'test@example.com');
        expect(actualTemplateParams).toHaveProperty('reply_to', 'test@example.com');
        expect(actualTemplateParams).toHaveProperty('savings_amount', '123.45');
        expect(actualTemplateParams).toHaveProperty('cost_24h', '500.00');
        expect(actualTemplateParams).toHaveProperty('optimized_cost', '376.55');
        expect(actualTemplateParams).toHaveProperty('savings_percent', '24.7');
        expect(actualTemplateParams).toHaveProperty('co2_savings', '50.00');
        expect(actualTemplateParams).toHaveProperty('calc_years', '5');
        expect(actualTemplateParams).toHaveProperty('electricity_price', '30');
        expect(actualTemplateParams).toHaveProperty('device_list', '- 1x Test Device (50W, 8h/5d/50w)');
        expect(actualTemplateParams).toHaveProperty('source_url', 'http://localhost/'); // jsdom standard URL

        // 6. Stelle sicher, dass die Erfolgsmeldung angezeigt wurde
        expect(global.showSuccessMessage).toHaveBeenCalledTimes(1); // Genau einmal
        expect(global.showSuccessMessage).toHaveBeenCalledWith(expect.any(HTMLElement), expect.stringContaining('Ergebnisse erfolgreich an test@example.com gesendet!'));
        expect(global.showErrorMessage).not.toHaveBeenCalled(); // Keine Fehlermeldung
    });

    // --- Test 2: Keine Berechnung durchgeführt ---
    test('should show error if calculation was not performed', async () => {
        // Simulieren, dass keine Berechnung erfolgte (savings = 0)
        document.getElementById('savings').textContent = '0';
        await sendEmail();
        expect(emailjs.send).not.toHaveBeenCalled();
        expect(global.showErrorMessage).toHaveBeenCalledTimes(1);
        expect(global.showErrorMessage).toHaveBeenCalledWith(expect.any(HTMLElement), expect.stringContaining('Bitte führen Sie zuerst eine Berechnung durch'));
        expect(global.showSuccessMessage).not.toHaveBeenCalled();
    });

    // --- Test 3: Benutzer bricht E-Mail-Eingabe ab ---
    test('should show error if user cancels prompt', async () => {
        global.prompt.mockReturnValue(null); // Benutzer klickt auf Abbrechen
        await sendEmail();
        expect(emailjs.send).not.toHaveBeenCalled();
        expect(global.showErrorMessage).toHaveBeenCalledTimes(1);
        expect(global.showErrorMessage).toHaveBeenCalledWith(expect.any(HTMLElement), expect.stringContaining('E-Mail-Versand abgebrochen'));
        expect(global.showSuccessMessage).not.toHaveBeenCalled();
    });

     // --- Test 4: Ungültige E-Mail eingegeben ---
     test('should show error for invalid email', async () => {
        global.prompt.mockReturnValue('invalid-email'); // Ungültige E-Mail
        await sendEmail();
        expect(emailjs.send).not.toHaveBeenCalled();
        expect(global.showErrorMessage).toHaveBeenCalledTimes(1);
        expect(global.showErrorMessage).toHaveBeenCalledWith(expect.any(HTMLElement), expect.stringContaining('Ungültige E-Mail-Adresse'));
        expect(global.showSuccessMessage).not.toHaveBeenCalled();
    });


    // --- Test 5: Fehler beim emailjs.send Aufruf ---
    test('should show error if emailjs.send fails', async () => {
        const mockError = { status: 500, text: 'Service Error' };

        emailjs.send.mockRejectedValue(mockError); // Simuliere einen Fehler beim Senden

        await sendEmail();

        expect(emailjs.send).toHaveBeenCalledTimes(1); // send wurde versucht
        expect(global.showSuccessMessage).not.toHaveBeenCalled(); // Kein Erfolg
        expect(global.showErrorMessage).toHaveBeenCalledTimes(1); // Genau eine Fehlermeldung
        expect(global.showErrorMessage).toHaveBeenCalledWith(expect.any(HTMLElement), expect.stringContaining(`Fehler beim Senden der E-Mail. (${mockError.text})`));
    });

}); 