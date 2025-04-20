export async function handler(event) {
  try {
    // Parse and validate input
    const { skinImage } = JSON.parse(event.body || "{}");

    if (!skinImage || !skinImage.startsWith("data:image")) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Invalid image format. Please provide a valid image.",
        }),
      };
    }

    console.log("Received image data");

    const API_URL = "https://api.openai.com/v1/chat/completions";
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "API key is not set" }),
      };
    }

    // Call OpenAI API
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
            role: "system",
            content:
              "Analyze the skin image and return JSON with skin type, concerns, and recommendations.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this skin image and return JSON with:
                - skinType (oily, dry, combination, normal)
                - primaryConcerns (array)
                - textureAnalysis
                - rednessLevel (none, mild, moderate, severe)
                - generalRecommendations (array)
                
                Format:
                {
                  "analysis": {
                    "skinType": "",
                    "primaryConcerns": [],
                    "textureAnalysis": "",
                    "rednessLevel": "",
                    "generalRecommendations": []
                  }
                }`,
              },
              {
                type: "image_url",
                image_url: {
                  url: skinImage,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "API request failed");
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from API");
    }

    // Parse and validate response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      throw new Error("Invalid JSON response from API");
    }

    if (!parsed.analysis) {
      throw new Error("Invalid analysis data format");
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(parsed),
    };
  } catch (error) {
    console.error("Image analysis failed:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: error.message || "Could not analyze image",
      }),
    };
  }
}
