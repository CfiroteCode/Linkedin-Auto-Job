
import { spawn } from 'child_process';

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
export default getAnswerFromPython;