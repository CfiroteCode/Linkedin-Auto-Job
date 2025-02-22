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
    page.waitForLoadState('networkidle');
    // Sélectionner la div en utilisant sa position dans la hiérarchie
    const targetDiv = await page.locator('div.scaffold-layout__list + div');

    // Attendre que l'élément soit visible
    await targetDiv.waitFor();

    // Scroller au maximum vers le bas
    await targetDiv.evaluate((div) => {
        div.scrollTo(0, div.scrollHeight);
    });
});