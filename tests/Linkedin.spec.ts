import { test } from '@playwright/test';
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
    await page.getByRole('combobox', { name: 'Chercher par intitulé de' }).fill('Développeur');
    await page.keyboard.press('Enter');
    await page.getByRole('combobox', { name: 'Ville, département ou code' }).fill('Nord, Hauts-de-France, France');
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


            let maxTries = 50; // Prevent infinite loops
            let tryCount = 0;

            while (tryCount < maxTries) {
                await page.waitForTimeout(2000);

                const modal = page.locator('div.jobs-easy-apply-modal__content');
                
                // Check if the <h2> with id "post-apply-modal" exists and contains "Candidature envoyée"
                const confirmationText = page.locator('h2#post-apply-modal');

                if (await confirmationText.isVisible()) {
                    const textContent = await confirmationText.innerText();
                    if (textContent.includes("Candidature envoyée")) {
                        console.log("✅ Candidature envoyée confirmation detected!");

                        const ignoreButton = page.getByRole('button', { name: 'Ignorer', exact: true });
                        await ignoreButton.click();
                        break;
                    } 
                }


                await modal.waitFor();
                const nextStepButton = modal.getByLabel('Passez à l’étape suivante', { exact: true });
                const submitButton = modal.getByLabel('Envoyer la candidature', { exact: true });
                const verifButton = modal.getByLabel('Vérifiez votre candidature', { exact: true });

                // Stop the loop when neither button is visible
                if (!nextStepButton && !submitButton) {
                    console.log("Both buttons are gone, exiting loop.");
                    break;
                }

                // Select all input fields inside the modal
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
                            console.log("Checking the checkbox...");
                            await input.check(); // Check the checkbox
                        } else {
                            console.log("Checkbox is already checked.");
                        }
                    }
                }

                console.log(`Found ${emptyInputs.length} empty inputs.`);

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

                if (emptyInputs.length == 0) {
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



            // aria-label="Passez à l’étape suivante" // aria-label="Envoyer la candidature"

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
    const prompt = `avec le CV ci-joint, ne donne QUE la réponse a cette question, un chiffre si c'est ce qui est demqndé ou une reponse courte: ${question}`;

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