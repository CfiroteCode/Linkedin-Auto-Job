import { Locator, test } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import GetAnswer from '../utils/GetAnswerFromPython.ts';
import * as path from 'path';

test('Fill all empty text inputs', async ({ page }) => {
    const filePath = `file://${path.resolve(__dirname, '../inputsExample/textInput.html')}`;

    await page.goto(filePath);


    // Get all <input> elements type text
    const inputContainers = await page.locator('div[data-test-single-line-text-form-component]').all();

    // Store the list of input fields with error messages
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

    console.log("🚀 List of input fields empty:");
    console.log(Inputs);

    // Loop through Inputs
    for (const { question, errorMessage, inputContainer } of Inputs) {
        const gptPrompt = question + " " + errorMessage;
        console.log(`❓ Gpt Prompt : ${gptPrompt}`);
        const answer = await GetAnswer(gptPrompt); // Await properly inside loop

        console.log(`Generated answer: ${answer}`);

        // Fill the input field with the answer
        await inputContainer.locator('input').fill(answer);
    }

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