//To use for select option in a form when LLM return a string
async function findClosestMatch(answer: string, options: string[]): string | undefined {
    // Normalize text by removing accents, extra spaces, and special characters
    // const normalizeText = (text: string) =>
    //     text
    //         .normalize("NFD") // Decomposes characters (é -> é)
    //         .replace(/[\u0300-\u036f]/g, "") // Removes accents
    //         .replace(/[^\w\s]/g, "") // Removes non-word characters (e.g., special chars like �)
    //         .trim()
    //         .toLowerCase();

    // Clean answer
    const normalizedAnswer = NormaliseText(answer);

    console.log(`🔍 Normalized answer: ${normalizedAnswer}`);

    let result = '';
    for (const option of options) {
        const normalizedOption = NormaliseText(option);
        if (normalizedOption.includes(normalizedAnswer)) {
            result = option;
            break;
        }
        console.log(`🔍 Normalized option: ${NormaliseText(option)}`);
    }

    // Find best matching option
    return result;
}

function NormaliseText(texte:string) {
    let result = texte.normalize("NFD") // Decomposes characters (é -> é)
                        .replace(/[\u0300-\u036f]/g, "") // Removes accents
                        .replace(/[^\w\s]/g, "") // Removes non-word characters (e.g., special chars like �)
                        .replace(/\s+/g, ' ')
                        .trim()
                        .toLowerCase();

    return result;
}

function fuzzyMatch(text: string, reference: string): boolean {
    const normalizedText = normalizeText(text);
    const normalizedReference = normalizeText(reference);

    return normalizedText.includes(normalizedReference) || normalizedReference.includes(normalizedText);
}

export default findClosestMatch