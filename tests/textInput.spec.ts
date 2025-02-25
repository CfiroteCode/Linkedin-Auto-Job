import { Locator, test } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import { spawn } from 'child_process';

test('test', async ({ page }) => {
    await page.goto('file:///C:/Users/Michael/Documents/Linkedin%20Job%20AI/Linkedin-Auto-Job/inputsExample/textInput.html');
    

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
        if ((await labelElement.isVisible() && await inputElement.isVisible())&& value == '' && type != 'file') {
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
        const answer = await getAnswerFromPython(gptPrompt); // Await properly inside loop

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