import { test } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import findClosestMatch from '../utils/findClosestMatch.ts';
import GetAnswer from '../utils/GetAnswerFromPython.ts';
import * as path from 'path';

test('test', async ({ page }) => {
    const filePath = `file://${path.resolve(__dirname, '../inputsExample/textInput.html')}`;

    await page.goto(filePath);
    
    // Get all <select> elements
    const selectFields = await page.locator('select').all();

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
            // console.log(`Gpt Prompt: ` + encodeURIComponent(gptPrompt));
            console.log(`Gpt Prompt: ` + gptPrompt);

            let answer = await GetAnswer(gptPrompt); // Await properly inside loop

            // Find the best matching option
            const matchingOption = await findClosestMatch(answer, selectOptions);
            await select.selectOption({ label: matchingOption });

            console.log(`Generated Select answer test: ` + answer);

        }

    }
});