import type { ChainablePromiseElement } from 'webdriverio';

const DEFAULT_TIMEOUT = 20000;

export async function tap(element: ChainablePromiseElement): Promise<void> {
    await element.waitForDisplayed({ timeout: DEFAULT_TIMEOUT });
    await element.click();
}

export async function enterText(
    element: ChainablePromiseElement,
    value: string,
): Promise<void> {
    await element.waitForDisplayed({ timeout: DEFAULT_TIMEOUT });
    await element.click();
    await element.setValue(value);
}

export async function readText(
    element: ChainablePromiseElement,
): Promise<string> {
    await element.waitForDisplayed({ timeout: DEFAULT_TIMEOUT });
    return (await element.getText()).trim();
}
