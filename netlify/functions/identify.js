export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { imageData } = JSON.parse(event.body);
    if (!imageData) {
      return { statusCode: 400, body: 'Missing image data' };
    }

    // Trim the API key to remove any accidental whitespace from the Netlify UI
    const apiKey = process.env.GEMINI_API_KEY
      ? process.env.GEMINI_API_KEY.trim()
      : null;

    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set.');
      return { statusCode: 500, body: 'API key is not configured.' };
    }

    // We will try these models in order until one works.
    // Using -latest aliases is often more reliable for 404 issues.
    const modelsToTry = ['gemini-1.5-flash-latest', 'gemini-1.5-flash'];
    let lastError = null;

    for (const model of modelsToTry) {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      console.log(`Attempting to call Google API with model: ${model}`);

      const prompt = `
                You are an expert entomologist. Analyze the attached image. Is the insect in the image a honeybee (Apis mellifera)?
                Your response must be structured in HTML.
                1. Start with an <h3> tag containing a clear, definitive answer: "Yes, this is a Honeybee.", "No, this is not a Honeybee.", or "Uncertain, but it appears to be a...".
                2. Follow with a <p> tag that provides a 2-4 sentence, easy-to-understand explanation for your conclusion.
                3. If it is NOT a honeybee, identify the insect if possible (e.g., Wasp, Bumblebee, Hornet) and use another <p> tag to explain the key visual differences from a honeybee.
            `;

      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: 'image/jpeg', data: imageData } },
            ],
          },
        ],
      };

      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await apiResponse.json();

      if (apiResponse.ok) {
        // Success! Return the result.
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result),
        };
      } else {
        console.warn(`Model ${model} failed:`, result.error?.message);
        lastError = result;
        // If it's a 404, we continue to the next model in the list
        if (apiResponse.status !== 404) break;
      }
    }

    // If we get here, all models failed
    console.error('All Google API models failed.');
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: lastError?.error?.message || 'Google API Error',
        status: lastError?.error?.status,
      }),
    };
  } catch (error) {
    console.error('Error in serverless function:', error);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};
