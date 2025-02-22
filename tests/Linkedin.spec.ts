import { test, expect } from '@playwright/test';
import dotenv from 'dotenv'; 
dotenv.config({ path: './.env' });

test('test', async ({ page }) => {
    await page.goto('https://www.linkedin.com/login/');
    await page.getByRole('textbox', { name: 'Email or phone' }).click();
    await page.getByRole('textbox', { name: 'Email or phone' }).click();
    await page.getByRole('textbox', { name: 'Email or phone' }).fill(process.env.LINKEDIN_EMAIL);
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill(process.env.LINKEDIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByRole('link', { name: 'Emplois' }).click();
    await page.getByRole('combobox', { name: 'Ville, département ou code' }).click();
    await page.getByRole('combobox', { name: 'Ville, département ou code' }).fill('Nord, Hauts-de-France, France');
    await page.getByRole('combobox', { name: 'Chercher par intitulé de' }).click();
    await page.getByRole('combobox', { name: 'Chercher par intitulé de' }).fill('Développeur');
    await page.keyboard.press('Enter');
    await page.getByRole('radio', { name: 'Filtre Candidature simplifiée.' }).click();
    
    // Select div
    const listContainer = page.locator('div.scaffold-layout__list-detail-container');

    // Wait for the container to be present in the DOM
    await listContainer.waitFor();

    // Click on the first <li> element to ensure focus
    const firstItem = await listContainer.locator('li').first();
    if (await firstItem.isVisible()) {
        await firstItem.click();
        console.log("Clicked on the first item.");
    }

    // Scroll down to load more elements
    let prevCount = 0;
    let reachedBottom = false;

    while (!reachedBottom) {
        const allItems = await listContainer.locator('li').all();
        const currentCount = allItems.length;

        if (currentCount > prevCount) {
            prevCount = currentCount;
            console.log(`Loaded ${currentCount} items, scrolling down...`);
        } else {
            reachedBottom = true;
        }

        // Scroll step by step
        await listContainer.evaluate((div) => div.scrollBy(0, 300));
        await page.waitForTimeout(500); // Wait for new items to load
    }

    console.log(`Final count of visible items: ${prevCount}`);
});