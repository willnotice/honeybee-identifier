export const handler = async (event) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY
      ? process.env.GEMINI_API_KEY.trim()
      : null;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API Key missing in Netlify' }),
      };
    }

    // --- DIAGNOSTIC STEP: List available models ---
    console.log('--- START DIAGNOSTIC ---');
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const listResponse = await fetch(listUrl);
    const listData = await listResponse.json();

    // This will print every model name your key can see into the Netlify logs
    console.log(
      'Available Models:',
      JSON.stringify(listData.models?.map((m) => m.name))
    );
    console.log('--- END DIAGNOSTIC ---');

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 200,
        body: 'Diagnostic run complete. Check Netlify logs.',
      };
    }

    const { imageData } = JSON.parse(event.body);

    // We'll try 'gemini-1.5-flash' one last time with the most basic v1beta path
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          parts: [
            { text: 'Is this a honeybee? Answer in HTML.' },
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
    return {
      statusCode: apiResponse.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Diagnostic Error:', error);
    return { statusCode: 500, body: error.message };
  }
};
