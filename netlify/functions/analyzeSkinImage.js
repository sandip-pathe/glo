export async function handler(event) {
  const { imageDataUrl } = JSON.parse(event.body || "{}");
  const API_URL = "https://api.openai.com/v1/chat/completions";
  const apiKey = process.env.OPENAI_API_KEY;
  try {
    // Check if the image data is valid
    if (!imageDataUrl.startsWith("data:image")) {
      throw new Error("Invalid image format");
    }

    // Check if the API key is set
    if (!apiKey) {
      throw new Error(
        "API key is not set. Please check your environment variables."
      );
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this skin image for skin type, concerns, texture, and redness. Return JSON format.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageDataUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "API request failed");
    }

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) {
      throw new Error("Invalid response format from API");
    }

    console.log("Image analysis result:", data.choices[0].message.content);
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error("Image analysis failed:", error);
    throw new Error("Could not analyze image. Please try again later.");
  }
}
