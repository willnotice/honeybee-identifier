// This is the serverless function that will securely call the Google AI API.
// It runs on Netlify's servers, not in the user's browser.

// CORRECTED: Changed from 'exports.handler = async function(event)' to the modern 'export const handler' syntax.
export const handler = async (event) => {
  // Only allow POST requests.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Get the image data sent from the frontend.
    const { imageData } = JSON.parse(event.body);
    if (!imageData) {
      return { statusCode: 400, body: 'Missing image data' };
    }

    // The API key is stored securely as an environment variable in Netlify.
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Added a check to make sure the API key is present.
      console.error(
        'GEMINI_API_KEY is not set in Netlify environment variables.'
      );
      return { statusCode: 500, body: 'API key is not configured.' };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const prompt = `
            You are an expert entomologist. Analyze the attached image. Is the insect in the image a honeybee (Apis mellifera)?
            Your response must be structured in HTML.
            1. Start with an <h3> tag containing a clear, definitive answer: "Yes, this is a Honeybee.", "No, this is not a Honeybee.", or "Uncertain, but it appears to be a...".
            2. Follow with a <p> tag that provides a 2-4 sentence, easy-to-understand explanation for your conclusion.
            3. If it is NOT a honeybee, identify the insect if possible (e.g., Wasp, Bumblebee, Hornet) and use another <p> tag to explain the key visual differences from a honeybee (e.g., "Honeybees are typically fuzzy, whereas this wasp has a smooth, shiny body.").
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

    // Call the Google API from our secure server function.
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!apiResponse.ok) {
      // If Google's API returns an error, pass it along.
      console.error(`Google API failed with status: ${apiResponse.status}`);
      return {
        statusCode: apiResponse.status,
        body: `Google API Error: ${apiResponse.statusText}`,
      };
    }

    const result = await apiResponse.json();

    // Send the result from Google back to the frontend.
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
