import { Locator, test } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import GetAnswer from '../utils/GetAnswerFromPython.ts';
import * as path from 'path';

test('Fill all empty text inputs', async ({ page }) => {
    const filePath = `file://${path.resolve(__dirname, '../inputsExample/radio.html')}`;

    await page.goto(filePath);


    // Locate all fieldsets
    const fieldsets = await page.locator('fieldset').all();

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
        const selectedRadio = fieldset.locator(`input[type="radio"][value="${answer}"]`);
        await selectedRadio.dispatchEvent("click");

    }
});