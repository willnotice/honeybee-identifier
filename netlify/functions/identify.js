// This function uses the v1beta endpoint with the gemini-1.5-flash model name.
export const handler = async (event) => {
  // Only allow POST requests.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { imageData } = JSON.parse(event.body);
    if (!imageData) {
      return { statusCode: 400, body: 'Missing image data' };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set.');
      return { statusCode: 500, body: 'API key is not configured.' };
    }

    // Define the model and version.
    // gemini-1.5-flash is the standard identifier for the vision-capable Flash model.
    const model = 'gemini-1.5-flash';
    const apiVersion = 'v1beta';
    const apiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;

    // Log the call for debugging (hiding the sensitive key)
    console.log(
      `Calling Google API: https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent`
    );

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

    if (!apiResponse.ok) {
      console.error(
        'Google API Error Detail:',
        JSON.stringify(result, null, 2)
      );
      return {
        statusCode: apiResponse.status,
        body: JSON.stringify({
          error: result.error?.message || 'Google API Error',
          status: result.error?.status,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error in serverless function:', error);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};
