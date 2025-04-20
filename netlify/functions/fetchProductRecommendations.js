export async function handler(event) {
  try {
    const { userProfile } = JSON.parse(event.body || "{}");

    console.log("Received user profile:", userProfile);

    const API_URL = "https://api.openai.com/v1/chat/completions";

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "API key is not set" }),
      };
    }

    // Better validation
    if (!userProfile || typeof userProfile !== "object") {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid user profile format" }),
      };
    }

    const systemInstructions = `You are an expert dermatologist assistant specializing in Indian skincare. 
        Recommend products available in India based on the user's profile.`;

    const prompt = `
        User Profile:
        - Skin Type: ${userProfile.skinType}
        - Main Concern: ${userProfile.primaryConcern}
        - Budget: ₹${userProfile.budget}
        - Environment: ${userProfile.environment}
        ${
          userProfile.skinImage
            ? "- Skin Analysis: " + userProfile.skinImage
            : ""
        }

        Please recommend suitable skincare products in this JSON format:
        {
            "products": [{
                "name": "Product Name (Brand)",
                "description": "Brief benefits",
                "price": "₹XXX",
                "keyIngredients": ["ing1", "ing2"],
                "affiliateLink": "URL",
                "whyMatch": "Brief explanation"
            }]
        }`.trim();

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
    const content = data.choices[0].message.content;
    console.log("API Response:", content);

    // Basic validation
    if (!content) throw new Error("Empty response from API");

    const parsed = JSON.parse(content);
    if (!parsed.products || !Array.isArray(parsed.products)) {
      throw new Error("Invalid product data format");
    }

    // Filter by budget
    const budget = parseInt(userProfile.budget) || 1000;
    const filteredProducts = parsed.products.filter((product) => {
      try {
        const productPrice = parseInt(
          product.price?.replace(/[^0-9]/g, "") || "1000"
        );
        return productPrice <= budget;
      } catch {
        return true; // Include product if price parsing fails
      }
    });

    return { products: filteredProducts };
  } catch (error) {
    console.error("Recommendation error:", error);
    throw new Error("Could not generate recommendations. Please try again.");
  }
}
