export async function handler(event) {
  try {
    // Parse and validate input
    const { userProfile } = JSON.parse(event.body || "{}");

    if (!userProfile || typeof userProfile !== "object") {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Invalid user profile format" }),
      };
    }

    console.log("Received user profile:", userProfile);

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

    // Prepare the prompt
    const systemInstructions = `You are an expert dermatologist assistant specializing in Indian skincare. 
        Recommend 3-5 products available in India based on the user's profile. Always return valid JSON.`;

    const prompt = `
        User Profile:
        - Skin Type: ${userProfile.skinType || "not specified"}
        - Main Concern: ${userProfile.primaryConcern || "not specified"}
        - Budget: ₹${userProfile.budget || "1000"}
        - Environment: ${userProfile.environment || "not specified"}

        Recommend products in this exact JSON format:
        {
            "products": [{
                "name": "Product Name (Brand)",
                "description": "Brief benefits",
                "price": "₹XXX",
                "keyIngredients": ["ing1", "ing2"],
                "affiliateLink": "URL",
                "whyMatch": "Why this matches the user's needs"
            }]
        }`.trim();

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
          { role: "system", content: systemInstructions },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: "json_object" },
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

    if (!parsed.products || !Array.isArray(parsed.products)) {
      throw new Error("Invalid product data format");
    }

    // Filter by budget if specified
    const budget = parseInt(userProfile.budget?.replace(/[^0-9]/g, "")) || 1000;
    const filteredProducts = parsed.products.filter((product) => {
      try {
        const productPrice = parseInt(
          product.price?.replace(/[^0-9]/g, "") || budget + 1
        );
        return productPrice <= budget;
      } catch {
        return true; // Include product if price parsing fails
      }
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ products: filteredProducts }),
    };
  } catch (error) {
    console.error("Recommendation error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: error.message || "Could not generate recommendations",
      }),
    };
  }
}
