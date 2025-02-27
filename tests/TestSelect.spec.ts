import { test } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import { spawn } from 'child_process';
import findClosestMatch from '../utils/findClosestMatch.ts';

test('test', async ({ page }) => {
    await page.goto('file:///C:/Users/Michael/Documents/Linkedin%20Job%20AI/Linkedin-Auto-Job/inputsExample/select.html');
    
    // Get all <select> elements
    const selectFields = await page.locator('select').all();

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

            // Find the best matching option
            const matchingOption = await findClosestMatch(answer, selectOptions);
            await select.selectOption({ label: matchingOption });

            console.log(`Generated Select answer test: ` + matchingOption);

        }

    }
});

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
// function findClosestMatch(answer: string, options: string[]): string | undefined {
//     // Normalize text by removing accents, extra spaces, and special characters
//     const normalizeText = (text: string) =>
//         text
//             .normalize("NFD") // Decomposes characters (é -> é)
//             .replace(/[\u0300-\u036f]/g, "") // Removes accents
//             .replace(/[^\w\s]/g, "") // Removes non-word characters (e.g., special chars like �)
//             .trim()
//             .toLowerCase();

//     // Clean answer
//     const normalizedAnswer = normalizeText(answer);

//     console.log(`🔍 Normalized answer: ${normalizedAnswer}`);

//     // Find best matching option
//     return options.find(option => normalizeText(option).includes(normalizedAnswer));
// }
