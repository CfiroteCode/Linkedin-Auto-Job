import { Locator, test } from '@playwright/test';
import dotenv from 'dotenv';
import config from '../config.js';
import GetAnswer from '../utils/GetAnswerFromPython.ts';
import findClosestMatch from '../utils/findClosestMatch.ts';
dotenv.config({ path: './.env' });

test('test', async ({ page }) => {
    await page.goto('https://www.linkedin.com/login/');
    await page.getByRole('textbox', { name: 'Email or phone' }).click();
    await page.getByRole('textbox', { name: 'Email or phone' }).fill(process.env.LINKEDIN_EMAIL);
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill(process.env.LINKEDIN_PASSWORD);
    await page.getByText('Keep me logged in').click();
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('link', { name: 'Emplois' }).click();
    await page.getByRole('combobox', { name: 'Chercher par intitulé de' }).fill(config.JOBPARAMETERS.JOB_SEARCH_KEYWORD);
    await page.keyboard.press('Enter');
    await page.getByRole('combobox', { name: 'Ville, département ou code' }).fill(config.JOBPARAMETERS.LOCATION);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    //add the filter 'Candidature simplifiée'
    const newParam = '&f_AL=true';
    await page.evaluate((param) => {
        const newUrl = new URL(window.location.href);

        // Check if the parameter already exists to avoid duplicates
        if (!newUrl.search.includes(param)) {
            newUrl.search += param;
            window.location.href = newUrl.toString(); // Reload the page with the new URL
        }
    }, newParam);

    // Wait for the page to reload
    await page.waitForLoadState('load');
    await page.waitForTimeout(5000);

    // await page.goto(newUrl.toString());// Change the URL to add filter Candidature simplifiée.
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

    // Print all job links, there is maximum 25 jobs by pages
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

            let maxTries = 25; // Prevent infinite loops
            let tryCount = 0;

            while (tryCount < maxTries) {
                // await page.waitForTimeout(2000);

                const modal = await page.locator('div.jobs-easy-apply-modal__content');
                await page.waitForTimeout(1000);

                // Check if "Candidature envoyée" exists in the modal
                const confirmationText = page.locator('h2', { hasText: 'Candidature envoyée' });
                const confirmationText2 = page.locator('h3', { hasText: 'Candidature envoyée' });

                //if it existe, close the modal
                if (await confirmationText.isVisible() || await confirmationText2.isVisible()) {
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

                // Get all <input> elements type text
                const inputContainers = await modal.locator('div[data-test-single-line-text-form-component]').all();

                // Store the list of input fields or with with error messages
                const Inputs: { question: string; errorMessage: string; inputContainer: Locator }[] = [];

                for (const container of inputContainers) {
                    const labelElement = container.locator('label');
                    const inputElement = container.locator('input');
                    const spanElement = container.locator('span.artdeco-inline-feedback__message');

                    const value = await getInputValueWithTimeout(inputElement, 100); // 100ms timeout
                    const type = await inputElement.getAttribute('type'); // Get input type

                    // Ensure all required elements exist and they are empty
                    if ((await labelElement.isVisible() && await inputElement.isVisible()) && (value == '' || (await spanElement.count()) > 0) && type != 'file') {
                        const question = (await labelElement.innerText()).trim();
                        const errorMessage = (await spanElement.count()) > 0 ? (await spanElement.innerText()).trim() : "";

                        Inputs.push({ question, errorMessage, inputContainer: container });
                    }
                }

                console.log("🚀 List of input fields empty or with errors:");
                console.log(Inputs);

                // Loop through Inputs text to fill
                for (const { question, errorMessage, inputContainer } of Inputs) {
                    const gptPrompt = question + " " + errorMessage;
                    console.log(`❓ Gpt Prompt text : ${gptPrompt}`);
                    const answer = await GetAnswer(gptPrompt); // Await properly inside loop

                    console.log(`✅ Generated answer: ${answer}`);

                    // Fill the input field with the answer
                    await inputContainer.locator('input').fill(answer);
                }

                // Loop through Inputs combobox
                for (const container of await page.locator('div[data-test-single-typeahead-entity-form-component]').all()) {
                    const inputElement = container.locator('input[role="combobox"]'); // Select only combobox inputs

                    if (await inputElement.count() > 0) { // Ensure the input exists
                        const labelElement = container.locator('label');
                        const errorMessageElement = container.locator('span.artdeco-inline-feedback__message');

                        // Extract question
                        const question = await labelElement.innerText();

                        // Check if there's an error message
                        const errorMessage = (await errorMessageElement.count()) > 0 ? (await errorMessageElement.innerText()).trim() : "";

                        console.log(`❓ Question: ${question}`);
                        console.log(`⚠️ Error Message: ${errorMessage || "None"}`);

                        // Generate an answer
                        const gptPrompt = question + (errorMessage ? ` || Error: ${errorMessage}` : "");
                        const answer = await GetAnswer(gptPrompt);
                        const formattedAnswer = answer.trim().normalize("NFC");

                        console.log(`✅ Generated Answer: ${formattedAnswer}`);

                        // Fill the input field
                        await inputElement.fill(formattedAnswer);
                        await page.waitForTimeout(3000);

                        // Press ArrowDown & Enter to select an autocomplete suggestion
                        await inputElement.press('ArrowDown');
                        await inputElement.press('Enter');

                        console.log(`🎯 Successfully filled: ${formattedAnswer}`);
                    }
                }

                const textareaInputs = await page.locator('textarea').all();
                for (const textarea of textareaInputs) {
                    const value = await getInputValueWithTimeout(textarea, 100);
                    if (value == '') {
                        const parentDiv = textarea.locator('xpath=..'); // Go to parent
                        const label = parentDiv.locator('label'); // Find label inside the parent
                        const question = await label.innerText();
                        const errorMessage = '';
                        const gptPrompt = question + " " + errorMessage;
                        console.log(`❓ Gpt Prompt textarea : ${gptPrompt}`);
                        const answer = await GetAnswer(gptPrompt);
                        await textarea.fill(answer);
                    }
                }

                // // Find all fieldsets with radio buttons
                // const fieldsets = await modal.locator('fieldset[data-test-form-builder-radio-button-form-component="true"]').all();
                // Locate all fieldsets
                const fieldsets = await modal.locator('fieldset').all();

                // Store valid fieldsets with radio buttons
                const fieldsetData: { question: string; answers: string[]; fieldset: any }[] = [];

                for (const fieldset of fieldsets) {
                    // Check if there are radio buttons inside the fieldset
                    const radioButtons = fieldset.locator('input[type="radio"]');

                    if (await radioButtons.count() > 0) {
                        // Get the question from the legend tag
                        const legend = fieldset.locator('legend');
                        const question = (await legend.innerText()).trim();

                        // Get all possible answers from the labels associated with the radio buttons
                        const labels = await fieldset.locator('label').allTextContents();
                        const answers = labels.map(label => label.trim());

                        // Store the extracted data
                        fieldsetData.push({ question, answers, fieldset });
                    }
                }

                console.log("🚀 Extracted Radio question Data:");
                for (const { question, answers, fieldset } of fieldsetData) {
                    const gptPrompt = question + " || only available answer, chose exactly one and do not modify or translate it: " + answers.join(', ');

                    console.log(`❓ Gpt Prompt: ${gptPrompt}`);

                    // Call AI to get an answer
                    let answer = await GetAnswer(gptPrompt); // Await properly inside loop

                    // ✅ Format the answer to remove unwanted characters
                    answer = answer.trim().normalize("NFC");

                    console.log(`Generated answer: ${answer}`);

                    // Locate the corresponding radio input by value and select it
                    const selectedRadio = await fieldset.locator(`input[type="radio"][value="${answer}"]`);
                    await selectedRadio.dispatchEvent("click");

                }

                // Get all <select> elements
                const selectFields = await modal.locator('select').all();

                // Store selects that'll need to be answered
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
                        // console.log(`Gpt Prompt: ` + encodeURIComponent(gptPrompt));
                        console.log(`❓ Gpt Prompt select : ` + gptPrompt);

                        let answer = await GetAnswer(gptPrompt); // Await properly inside loop

                        // Find the best matching option
                        const matchingOption = await findClosestMatch(answer, selectOptions);
                        await select.selectOption({ label: matchingOption });

                        console.log(`✅ Generated Select answer : ` + answer);

                    }

                    console.log(`Unanswered selects: ${unansweredSelects.length}`);
                    console.log("Available select options (excluding first):", selectOptions);
                }




                if (nextStepButton) nextStepButton.click();
                if (submitButton) submitButton.click();
                if (verifButton) verifButton.click();



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