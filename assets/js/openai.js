const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api.openai.com/v1/chat/completions";

if (!OPENAI_API_KEY) throw new Error("❌ OpenAI API key not found!");

export const fetchProductRecommendations = async (userProfile) => {
  try {
    const systemInstructions = `You are an expert dermatologist assistant specializing in Indian skincare. 
Recommend products available in India based on:
- Skin type: ${userProfile.skinType}
- Primary concern: ${userProfile.primaryConcern}
- Budget: ₹${userProfile.budget}
- Environment: ${userProfile.environment}
${
  userProfile.skinImage
    ? "- AI skin analysis results: " + userProfile.skinImage
    : ""
}

Consider:
1. Indian market availability (Nykaa, Amazon India, Purplle)
2. Budget constraints
3. Local environmental factors
4. Skin compatibility
5. Scientifically proven ingredients`;

    const prompt = `
Generate personalized skincare recommendations in JSON format for:
- Skin Type: ${userProfile.skinType}
- Main Concern: ${userProfile.primaryConcern}
- Budget: ${userProfile.budget}
- Location Factors: ${userProfile.environment}

Include these details per product:
{
  "products": [
    {
      "name": "Product Name (Brand)",
      "description": "Max 20 words focusing on user benefits",
      "price": "₹XXX",
      "keyIngredients": ["ing1", "ing2"],
      "bestFor": ["skinType", "concern"],
      "affiliateLink": "Nykaa/Amazon India URL",
      "whyMatch": "20-word explanation of match to user profile"
    }
  ]
}
    `.trim();

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemInstructions },
          { role: "user", content: prompt },
        ],
        temperature: 0.3, // Lower for more consistent results
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const { choices } = await response.json();
    const content = choices[0].message.content;

    // Validate response format
    const parsed = JSON.parse(content);
    if (!parsed.products?.length) throw new Error("Invalid product format");

    // Filter by budget
    const budget = parseInt(userProfile.budget);
    const filteredProducts = parsed.products.filter((product) => {
      const productPrice = parseInt(product.price.replace(/[^0-9]/g, ""));
      return productPrice <= budget;
    });

    return { products: filteredProducts };
  } catch (err) {
    console.error("AI Recommendation Error:", err);
    throw new Error(`Recommendation failed: ${err.message}`);
  }
};

// Image Analysis Helper (in script.js)
let imageAnalysisCount = 2; // Default to 2 for testing

export const analyzeSkinImage = async (imageFile) => {
  // Check daily limit
  if (imageAnalysisCount >= 5) {
    throw new Error("Daily image analysis limit (5) reached");
  }

  // GPT-4 Vision API call
  const visionResponse = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this skin image for:
            - Skin type (oily/dry/combination/normal)
            - Visible concerns (acne, pigmentation, wrinkles)
            - Texture analysis
            - Pore size
            - Redness indicators
            Return as JSON: {skinType: "", concerns: [], texture: "", poreSize: "", redness: boolean}`,
              },
              {
                type: "image_url",
                image_url: {
                  url: await toBase64(imageFile),
                },
              },
            ],
          },
        ],
        max_tokens: 300,
      }),
    }
  );

  imageAnalysisCount++;
  localStorage.setItem("imageAnalysisCount", imageAnalysisCount);

  const data = await visionResponse.json();
  return JSON.parse(data.choices[0].message.content);
};

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}
