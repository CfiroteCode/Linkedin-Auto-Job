import { Locator, test } from '@playwright/test';
import dotenv from 'dotenv';
import config from '../config.js';
dotenv.config({ path: './.env' });
import { spawn } from 'child_process';

test('test', async ({ page }) => {
    await page.goto('https://www.linkedin.com/login/');
    await page.getByRole('textbox', { name: 'Email or phone' }).click();
    await page.getByRole('textbox', { name: 'Email or phone' }).fill(process.env.LINKEDIN_EMAIL);
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill(process.env.LINKEDIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('link', { name: 'Emplois' }).click();
    await page.getByRole('combobox', { name: 'Chercher par intitulé de' }).fill(process.env.JOB_SEARCH_KEYWORD);
    await page.keyboard.press('Enter');
    await page.getByRole('combobox', { name: 'Ville, département ou code' }).fill(process.env.LOCATION);
    await page.keyboard.press('Enter');
    await page.getByRole('radio', { name: 'Filtre Candidature simplifiée.' }).click();

    // Select div
    const listContainer = page.locator('div.scaffold-layout__list-detail-container');

    // Wait for the container to be present in the DOM
    await listContainer.waitFor();

    // Click on the first job link to ensure focus
    const firstJob = listContainer.locator('a.job-card-container__link').first();
    if (await firstJob.isVisible()) {
        await firstJob.click();
        console.log("Clicked on the first job link.");
    }

    // Scroll until the button is visible
    let maxScrolls = 7;
    let scrollCount = 0;

    while (scrollCount < maxScrolls) {
        console.log(`Scrolling... (${scrollCount + 1})`);

        // Scroll down gradually
        await page.mouse.wheel(0, 600);
        await page.waitForTimeout(700); // Wait for new items to load

        scrollCount++;
    }

    await page.mouse.wheel(0, -4200);

    // Get all job links dynamically
    const allLinks = await listContainer.locator('a.job-card-list__title--link').all();
    console.log(`Total job links collected: ${allLinks.length}`);

    // Print all job links
    console.log([...allLinks]);

    for (const job of allLinks) {

        console.log(`Opening job: ${job}`);
        await job.click();

        // Wait for the job page to fully load
        await page.waitForTimeout(2000);


        // Locate the "Candidature simplifiée" button
        const easyApplyButton = await page.$(config.SELECTORS.APPLICATION.EASY_APPLY);

        if (easyApplyButton) {
            console.log("Applying for the job...");
            await page.$('button.jobs-apply-button');
            await easyApplyButton.click();

            //take all empty form inputs
            let numericInputs = [];
            let textInputs = [];
            let binaryInputs = [];


            let maxTries = 25; // Prevent infinite loops, and there is maximum 25 jobs by pages
            let tryCount = 0;

            while (tryCount < maxTries) {
                await page.waitForTimeout(2000);

                const modal = page.locator('div.jobs-easy-apply-modal__content');
                await modal.waitFor();

                // Check if the <h2> with id "post-apply-modal" exists and contains "Candidature envoyée"
                const confirmationText = await page.locator('h2#post-apply-modal');

                //if it existe, close the modal
                if (await confirmationText.isVisible()) {
                    const textContent = await confirmationText.innerText();
                    if (textContent.includes("Candidature envoyée")) {
                        console.log("✅ Candidature envoyée confirmation detected!");

                        const ignoreButton = page.getByRole('button', { name: 'Ignorer', exact: true });
                        await ignoreButton.click();
                        break;
                    }
                }


                const nextStepButton = modal.getByLabel('Passez à l’étape suivante', { exact: true });
                const submitButton = modal.getByLabel('Envoyer la candidature', { exact: true });
                const verifButton = modal.getByLabel('Vérifiez votre candidature', { exact: true });

                // Stop the loop when neither button is visible
                if (!nextStepButton && !submitButton) {
                    console.log("Both buttons are gone, exiting loop.");
                    break;
                }

                // Select all inputs fields inside the modal
                const inputFields = await modal.locator('input').all();

                // Filter empty input fields
                const emptyInputs = [];
                for (const input of inputFields) {
                    const value = await getInputValueWithTimeout(input, 100); // 100ms timeout
                    const type = await input.getAttribute('type'); // Get input type

                    if (value == '' && type != 'file') {
                        emptyInputs.push(input);
                    } else if (type === 'checkbox') {
                        const isChecked = await input.isChecked(); // Check if already checked
                        if (!isChecked) {
                            const tryCheck = 3
                            let check = 0
                            while (check < tryCheck) {
                                console.log("Checking the checkbox...");
                                await input.dispatchEvent("click");
                                check++;
                            }
                        } else {
                            console.log("Checkbox is already checked.");
                        }
                    }
                }

                console.log(`Found ${emptyInputs.length} empty inputs Texte.`);

                for (const input of emptyInputs) {
                    console.log(input);
                    const parent_locator = input.locator('..');
                    const labelElement = parent_locator.locator('label');

                    if (await labelElement.isVisible() && await input.isVisible()) {
                        const question = await labelElement.innerText(); // Get the question from the label
                        console.log(`Question found: ${question}`);

                        // Get the answer from the Python script
                        const answer = await getAnswerFromPython(question);
                        console.log(`Generated answer: ${answer}`);

                        // Fill the input field with the answer
                        await input.fill(answer);
                    }
                }

                // Get all input fields inside the modal
                const inputContainers = await modal.locator('div[data-test-single-line-text-form-component]').all();

                // Store the list of input fields with error messages
                const errorInputs: { question: string; errorMessage: string; inputContainer: Locator }[] = [];

                for (const container of inputContainers) {
                    const labelElement = container.locator('label');
                    const inputElement = container.locator('input');
                    const spanElement = container.locator('span.artdeco-inline-feedback__message');

                    // Ensure all required elements exist
                    if (await labelElement.isVisible() && await inputElement.isVisible() && await spanElement.isVisible()) {
                        const question = (await labelElement.innerText()).trim();
                        const errorMessage = (await spanElement.innerText()).trim();

                        errorInputs.push({ question, errorMessage, inputContainer: container });
                    }
                }

                console.log("🚀 List of input fields with error messages:");
                console.log(errorInputs);

                // Loop through errorInputs
                for (const { question, errorMessage, inputContainer } of errorInputs) {
                    const gptPrompt = question + " " + errorMessage;
                    const answer = await getAnswerFromPython(gptPrompt); // Await properly inside loop

                    console.log(`Generated answer: ${answer}`);

                    // Fill the input field with the answer
                    await inputContainer.locator('input').fill(answer);
                }

                // Find all fieldsets with radio buttons
                const fieldsets = await modal.locator('fieldset[data-test-form-builder-radio-button-form-component="true"]').all();

                for (const fieldset of fieldsets) {
                    const yesOption = fieldset.locator(
                        'input[type="radio"][value="Yes"], input[type="radio"][value="Oui"], ' +
                        'input[data-test-text-selectable-option__input="Yes"], input[data-test-text-selectable-option__input="Oui"]'
                    );

                    if (await yesOption.isVisible()) {
                        console.log("✅ Clicking 'Yes' option...");
                        // await yesOption.check();
                        await yesOption.dispatchEvent("click"); // Selects the "Yes" radio button
                    } else {
                        console.log("❌ 'Yes' option not found.");
                    }
                }

                // Get all <select> elements
                const selectFields = await modal.locator('select').all();

                // Store selects that need to be answered
                const unansweredSelects: any[] = [];

                // Store available options for each select (excluding the first one)
                const selectOptions: Record<string, string[]> = {};

                for (const select of selectFields) {
                    const selectId = await select.getAttribute('id');
                    if (!selectId) continue; // Skip if no ID found
                    const options = await select.locator('option').allTextContents(); // Get all options text
                    const firstOption = (await select.locator('option').first().textContent())?.trim() || "";
                    const selectedOption = await select.inputValue(); // Get the currently selected value

                    const labelLocator = page.locator(`label[for="${selectId}"]`);

                    let question = '';
                    if (await labelLocator.isVisible()) {
                        // Extract the question text
                        question = (await labelLocator.innerText()).trim();
                        console.log(`❓ Question: ${question}`);
                    } else {
                        console.log(`❌ No label found for select with ID: ${selectId}`);
                    }

                    // If the selected option is the first option, it needs to be answered
                    if (selectedOption === firstOption) {
                        unansweredSelects.push(select);

                        // Store all options except the first one (trimmed)
                        const selectOptions = options.slice(1).map(opt => opt.trim()); // Remove first option
                        let availableOptions = '';

                        selectOptions.forEach(opt => {
                            // Assuming opt is a string or can be converted to a string
                            availableOptions += opt.toString() + ' || ';
                        });

                        // Optionally, you can trim the last ' || ' if needed
                        availableOptions = availableOptions.slice(0, -4); // Remove the last ' || '

                        const gptPrompt = question + " the only answer available are :" + availableOptions;
                        console.log(`Gpt Prompt: ` + encodeURIComponent(gptPrompt));

                        let answer = await getAnswerFromPython(decodeURIComponent(gptPrompt)); // Await properly inside loop
                        // answer = answer.slice(0, -5).trim().normalize("NFC");

                        // Find the best matching option
                        const matchingOption = await findClosestMatch(answer, selectOptions);
                        await select.selectOption({ label: matchingOption });

                        console.log(`Generated Select answer test: ` + matchingOption);

                    }

                }

                console.log(`Unanswered selects: ${unansweredSelects.length}`);
                console.log("Available select options (excluding first):", selectOptions);

                if (emptyInputs.length == 0 && unansweredSelects.length == 0) {
                    if (nextStepButton) nextStepButton.click();
                    if (submitButton) submitButton.click();
                    if (verifButton) verifButton.click();

                    const successText = await modal.locator('text="Votre candidature a été envoyée"').isVisible();

                    if (successText) {
                        console.log("Candidature confirmation detected.");

                        // Locate the "Ignorer" button
                        const ignoreButton = modal.getByRole('button', { name: 'Ignorer', exact: true });

                        if (await ignoreButton.isVisible()) {
                            console.log("Clicking 'Ignorer' button...");
                            await ignoreButton.click();
                        } else {
                            console.log("'Ignorer' button not found.");
                        }
                    }
                }

                tryCount++;
            }


        } else {
            console.log("No 'Candidature simplifiée' button found.");
        }
    }

    console.log("Finished processing all jobs.");

});

// Function with timeout for input.value()
async function getInputValueWithTimeout(input: Locator, timeoutMs: number): Promise<string | null> {
    try {
        return await Promise.race([
            input.inputValue(),
            new Promise<string | null>((_, reject) =>
                setTimeout(() => reject(new Error('Timeout exceeded')), timeoutMs)
            )
        ]);
    } catch (error) {
        console.log(`Skipping input due to timeout (${timeoutMs}ms).`);
        return null;
    }
}

// Function to call the Python script and get the answer
async function getAnswerFromPython(question: string): Promise<string> {
    const prompt = `avec le CV ci-joint, ne donne QUE la réponse a cette question, un chiffre si c'est ce qui est demandé ou une reponse courte: ${question}`;

    try {
        const pythonProcess = spawn('python', ['gpt4free.py', prompt]);

        let response = '';

        // Collect data from the Python script
        pythonProcess.stdout.on('data', (data) => {
            response += data.toString();
        });

        // Handle errors from the Python script
        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python Error: ${data}`);
        });

        // Wait for the Python process to exit
        await new Promise((resolve, reject) => {
            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    resolve(response);
                } else {
                    reject(new Error(`Python process exited with code ${code}`));
                }
            });
        });

        console.log(response);
        return response;

    } catch (error) {
        console.error("GPT Error:", error);
        return "An error occurred while processing your request.";
    }
}

// Function to find the closest matching option
function findClosestMatch(answer: string, options: string[]): string | undefined {
    // Normalize text by removing accents, extra spaces, and special characters
    const normalizeText = (text: string) =>
        text
            .normalize("NFD") // Decomposes characters (é -> é)
            .replace(/[\u0300-\u036f]/g, "") // Removes accents
            .replace(/[^\w\s]/g, "") // Removes non-word characters (e.g., special chars like �)
            .trim()
            .toLowerCase();

    // Clean answer
    const normalizedAnswer = normalizeText(answer);

    console.log(`🔍 Normalized answer: ${normalizedAnswer}`);

    // Find best matching option
    return options.find(option => normalizeText(option).includes(normalizedAnswer));
}
