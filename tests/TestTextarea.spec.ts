import { test, Locator } from '@playwright/test';
import GetAnswer from '../utils/GetAnswerFromPython.ts';
import * as path from 'path';


test('test', async ({ page }) => {
    const filePath = `file://${path.resolve(__dirname, '../inputsExample/textInput.html')}`;

    await page.goto(filePath);

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