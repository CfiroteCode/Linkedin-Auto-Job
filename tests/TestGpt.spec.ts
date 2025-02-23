import { spawn } from 'child_process';
import { test } from '@playwright/test';

test('Gpt', async () => {
    await getAnswerFromPython("What is your greatest strength?")
    .then((answer) => console.log("Generated answer:", answer))
    .catch((error) => console.error("GPT Error:", error.message));
});

// Function to call the Python script and get the answer
async function getAnswerFromPython(question: string): Promise<string> {
    const prompt = `avec le CV ci-joint, ne donne QUE la réponse a cette question: ${question}`;

    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', ['gpt4free.py', prompt]);

        let response = '';
        let errorMessage = '';

        // Collect data from the Python script
        pythonProcess.stdout.on('data', (data) => {
            response += data.toString();
        });

        // Collect error messages from stderr
        pythonProcess.stderr.on('data', (data) => {
            errorMessage += data.toString();
        });

        // Wait for the Python process to exit
        pythonProcess.on('close', (code) => {
            if (code === 0) {
                resolve(response.trim());
            } else {
                reject(new Error(`Python process exited with code ${code}. Error Message: ${errorMessage.trim()}`));
            }
        });

        pythonProcess.on('error', (error) => {
            reject(new Error(`Failed to start Python script: ${error.message}`));
        });
    });
}