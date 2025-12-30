import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { pool } from '../db';

const router = Router();

const VALID_FLAVOR_TAGS = [
  'Fruity', 'Nutty', 'Chocolatey', 'Caramel', 'Floral',
  'Bright', 'Smooth', 'Bold', 'Bitter', 'Sweet',
  'Earthy', 'Spicy', 'Citrus', 'Berry', 'Creamy'
];

// Initialize Anthropic client
const getAnthropicClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  return new Anthropic({ apiKey });
};

// Tool definition for structured drink parsing
const parseDrinkTool: Anthropic.Tool = {
  name: 'parse_drink',
  description: 'Parse natural language coffee drink description into structured data',
  input_schema: {
    type: 'object',
    properties: {
      drink_type: {
        type: 'string',
        description: 'The type of coffee drink, properly capitalized (e.g., "Cortado", "Pour Over", "Flat White", "Cold Brew", "Latte", "Espresso", "Cappuccino", "Americano")'
      },
      cafe_name: {
        type: 'string',
        description: 'The name of the cafe/coffee shop, properly capitalized as a business name (e.g., "Blue Bottle", "Stumptown Coffee", "Intelligentsia")'
      },
      location_hint: {
        type: 'string',
        description: 'Any location info mentioned (city, neighborhood, landmark, address) to help find the cafe. E.g., "New York City, Rockefeller Center" or "San Francisco, Mission District"'
      },
      flavor_tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Flavor descriptors from: Fruity, Nutty, Chocolatey, Caramel, Floral, Bright, Smooth, Bold, Bitter, Sweet, Earthy, Spicy, Citrus, Berry, Creamy'
      },
      price: {
        type: 'number',
        description: 'The price in dollars if mentioned'
      },
      rating: {
        type: 'number',
        description: 'Rating 1-5 inferred from sentiment. 5=amazing/perfect/incredible, 4=great/really good, 3=good/decent/fine, 2=okay/mediocre, 1=bad/terrible'
      },
      notes: {
        type: 'string',
        description: 'ONLY include extra context not already captured in other fields. Do NOT repeat: drink type, cafe name, location, price, rating sentiment, or flavor tags. Leave empty if nothing extra to add.'
      },
      interpretation: {
        type: 'string',
        description: 'Brief explanation of how you interpreted the input'
      }
    },
    required: ['interpretation']
  }
};

// Fuzzy match cafe name to existing cafes
const findMatchingCafe = (cafeName: string, userCafes: { id: number; name: string }[]): { id: number; name: string } | null => {
  if (!cafeName) return null;

  const normalizedInput = cafeName.toLowerCase().trim();

  // Exact match first
  const exactMatch = userCafes.find(c => c.name.toLowerCase() === normalizedInput);
  if (exactMatch) return exactMatch;

  // Partial match (input contains cafe name or vice versa)
  const partialMatch = userCafes.find(c =>
    c.name.toLowerCase().includes(normalizedInput) ||
    normalizedInput.includes(c.name.toLowerCase())
  );
  if (partialMatch) return partialMatch;

  // Word-based match (any significant word matches)
  const inputWords = normalizedInput.split(/\s+/).filter(w => w.length > 2);
  const wordMatch = userCafes.find(c => {
    const cafeWords = c.name.toLowerCase().split(/\s+/);
    return inputWords.some(iw => cafeWords.some(cw => cw.includes(iw) || iw.includes(cw)));
  });

  return wordMatch || null;
};

// POST /api/ai/parse - Parse natural language into structured drink data
router.post('/parse', async (req, res) => {
  try {
    const { text } = req.body;
    const userId = req.userId;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text input is required'
      });
    }

    if (text.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Text input must be under 1000 characters'
      });
    }

    // Get user's existing cafes for matching
    const cafesResult = await pool.query(
      'SELECT id, name FROM cafes WHERE user_id = $1 ORDER BY name',
      [userId]
    );
    const userCafes = cafesResult.rows;

    const anthropic = getAnthropicClient();

    const cafeListStr = userCafes.length > 0
      ? `User's existing cafes: ${userCafes.map(c => c.name).join(', ')}`
      : 'User has no existing cafes yet.';

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      tools: [parseDrinkTool],
      tool_choice: { type: 'tool', name: 'parse_drink' },
      messages: [
        {
          role: 'user',
          content: `You are parsing a coffee drink log entry. Extract all available information from the user's natural language input.

IMPORTANT FORMATTING RULES:
1. CAPITALIZE drink_type properly: "Cortado", "Pour Over", "Flat White", "Cold Brew" (not "cortado" or "pour over")
2. CAPITALIZE cafe_name as a proper business name: "Blue Bottle", "Stumptown Coffee" (not "blue bottle")
3. Extract ANY location info (city, neighborhood, landmark, street) into location_hint - this helps find the cafe on Google Maps
4. ONLY put truly extra info in notes - do NOT repeat drink type, cafe, location, price, sentiment, or flavors

${cafeListStr}

Valid flavor tags (only use these exact values): ${VALID_FLAVOR_TAGS.join(', ')}

Rating inference guide:
- "amazing", "incredible", "perfect", "best ever", "loved it", "absolutely delicious" -> 5
- "great", "really good", "enjoyed", "solid", "fantastic" -> 4
- "good", "decent", "fine", "nice", "okay" -> 3
- "mediocre", "meh", "not great", "disappointing" -> 2
- "bad", "terrible", "awful", "couldn't finish" -> 1

If no sentiment is expressed, do not include a rating.

Parse this text: "${text}"`
        }
      ]
    });

    // Extract tool use result
    const toolUse = response.content.find(block => block.type === 'tool_use');

    if (!toolUse || toolUse.type !== 'tool_use') {
      return res.status(500).json({
        success: false,
        error: 'Failed to parse input'
      });
    }

    const parsed = toolUse.input as {
      drink_type?: string;
      cafe_name?: string;
      location_hint?: string;
      flavor_tags?: string[];
      price?: number;
      rating?: number;
      notes?: string;
      interpretation?: string;
    };

    // Validate and filter flavor tags
    const validatedTags = (parsed.flavor_tags || [])
      .filter(tag => VALID_FLAVOR_TAGS.includes(tag));

    // Try to match cafe to existing user cafes
    const matchedCafe = findMatchingCafe(parsed.cafe_name || '', userCafes);

    // Validate rating range
    let validatedRating = parsed.rating;
    if (validatedRating !== undefined) {
      validatedRating = Math.max(1, Math.min(5, Math.round(validatedRating)));
    }

    // Validate price range
    let validatedPrice = parsed.price;
    if (validatedPrice !== undefined) {
      validatedPrice = Math.max(0, Math.min(100, validatedPrice));
    }

    // Build Google Places search query if we have a new cafe with location
    let placesSearchQuery: string | null = null;
    if (parsed.cafe_name && !matchedCafe) {
      placesSearchQuery = parsed.location_hint
        ? `${parsed.cafe_name} ${parsed.location_hint}`
        : parsed.cafe_name;
    }

    res.json({
      success: true,
      data: {
        drink_type: parsed.drink_type || null,
        cafe_name: parsed.cafe_name || null,
        cafe_id: matchedCafe?.id || null,
        matched_cafe_name: matchedCafe?.name || null,
        location_hint: parsed.location_hint || null,
        places_search_query: placesSearchQuery,
        flavor_tags: validatedTags,
        price: validatedPrice ?? null,
        rating: validatedRating ?? null,
        notes: parsed.notes || null
      },
      raw_interpretation: parsed.interpretation || 'Parsed coffee drink entry'
    });

  } catch (error) {
    console.error('Error parsing with AI:', error);

    if (error instanceof Error && error.message.includes('ANTHROPIC_API_KEY')) {
      return res.status(500).json({
        success: false,
        error: 'AI service not configured'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to parse input'
    });
  }
});

// Tool definition for recommendations
const recommendationTool: Anthropic.Tool = {
  name: 'generate_recommendation',
  description: 'Generate a personalized coffee recommendation based on user preferences',
  input_schema: {
    type: 'object',
    properties: {
      suggestion: {
        type: 'string',
        description: 'A friendly, personalized recommendation (1-2 sentences)'
      },
      reasoning: {
        type: 'string',
        description: 'Brief explanation of why this recommendation fits the user'
      },
      recommended_tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Flavor tags to try next, from: Fruity, Nutty, Chocolatey, Caramel, Floral, Bright, Smooth, Bold, Bitter, Sweet, Earthy, Spicy, Citrus, Berry, Creamy'
      },
      try_next_drink: {
        type: 'string',
        description: 'A specific drink type suggestion (e.g., "cortado", "pour over")'
      }
    },
    required: ['suggestion', 'reasoning', 'recommended_tags']
  }
};

// POST /api/ai/recommendations - Get personalized flavor recommendations
router.post('/recommendations', async (req, res) => {
  try {
    const userId = req.userId;

    // Get user's flavor preferences with ratings
    const flavorStatsResult = await pool.query(`
      SELECT
        unnest(flavor_tags) as tag,
        COUNT(*) as count,
        ROUND(AVG(rating)::numeric, 2) as avg_rating
      FROM drinks
      WHERE user_id = $1 AND flavor_tags IS NOT NULL
      GROUP BY tag
      ORDER BY count DESC
    `, [userId]);

    // Get user's drink type preferences
    const drinkStatsResult = await pool.query(`
      SELECT
        drink_type,
        COUNT(*) as count,
        ROUND(AVG(rating)::numeric, 2) as avg_rating
      FROM drinks
      WHERE user_id = $1
      GROUP BY drink_type
      ORDER BY count DESC
      LIMIT 5
    `, [userId]);

    // Get total drink count
    const totalResult = await pool.query(
      'SELECT COUNT(*) as total FROM drinks WHERE user_id = $1',
      [userId]
    );
    const totalDrinks = parseInt(totalResult.rows[0].total);

    // Get recent high-rated drinks for context
    const recentHighRatedResult = await pool.query(`
      SELECT d.drink_type, d.flavor_tags, d.rating, c.name as cafe_name
      FROM drinks d
      JOIN cafes c ON d.cafe_id = c.id
      WHERE d.user_id = $1 AND d.rating >= 4
      ORDER BY d.logged_at DESC
      LIMIT 5
    `, [userId]);

    // Check if user has enough data
    if (totalDrinks < 3) {
      return res.json({
        success: true,
        recommendation: {
          suggestion: "Log a few more drinks to get personalized recommendations! Try different flavor profiles to help us understand your preferences.",
          reasoning: "You need at least 3 logged drinks for personalized recommendations.",
          recommended_tags: ['Smooth', 'Chocolatey', 'Caramel'],
          try_next_drink: null
        },
        user_profile: {
          favorite_tags: [],
          total_drinks_analyzed: totalDrinks
        }
      });
    }

    const flavorStats = flavorStatsResult.rows;
    const drinkStats = drinkStatsResult.rows;
    const recentHighRated = recentHighRatedResult.rows;

    // Build user profile summary for Claude
    const favoriteTags = flavorStats.slice(0, 3).map(r => r.tag);
    const highRatedTags = flavorStats
      .filter(r => parseFloat(r.avg_rating) >= 4)
      .map(r => r.tag);
    const lessExploredTags = VALID_FLAVOR_TAGS.filter(
      tag => !flavorStats.find(r => r.tag === tag)
    );

    const anthropic = getAnthropicClient();

    const profileSummary = `
User Coffee Profile:
- Total drinks logged: ${totalDrinks}
- Most used flavor tags: ${flavorStats.slice(0, 5).map(r => `${r.tag} (${r.count}x, avg ${r.avg_rating})`).join(', ') || 'None yet'}
- Highest rated tags: ${highRatedTags.slice(0, 3).join(', ') || 'Not enough data'}
- Tags not yet explored: ${lessExploredTags.slice(0, 5).join(', ') || 'All explored!'}
- Favorite drink types: ${drinkStats.slice(0, 3).map(r => `${r.drink_type} (${r.count}x)`).join(', ') || 'Varied'}
- Recent highly-rated drinks: ${recentHighRated.map(r => `${r.drink_type} at ${r.cafe_name} (${r.rating}/5)`).join(', ') || 'None recently'}
`;

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      tools: [recommendationTool],
      tool_choice: { type: 'tool', name: 'generate_recommendation' },
      messages: [
        {
          role: 'user',
          content: `Based on this coffee drinker's profile, generate a personalized recommendation. Be encouraging and specific. Either suggest exploring new flavor profiles they haven't tried, or doubling down on what they love.

${profileSummary}

Generate a friendly recommendation that feels personal to their tastes.`
        }
      ]
    });

    // Extract tool use result
    const toolUse = response.content.find(block => block.type === 'tool_use');

    if (!toolUse || toolUse.type !== 'tool_use') {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate recommendation'
      });
    }

    const recommendation = toolUse.input as {
      suggestion: string;
      reasoning: string;
      recommended_tags: string[];
      try_next_drink?: string;
    };

    // Validate recommended tags
    const validatedRecommendedTags = (recommendation.recommended_tags || [])
      .filter(tag => VALID_FLAVOR_TAGS.includes(tag));

    res.json({
      success: true,
      recommendation: {
        suggestion: recommendation.suggestion,
        reasoning: recommendation.reasoning,
        recommended_tags: validatedRecommendedTags,
        try_next_drink: recommendation.try_next_drink || null
      },
      user_profile: {
        favorite_tags: favoriteTags,
        high_rated_tags: highRatedTags.slice(0, 5),
        unexplored_tags: lessExploredTags,
        total_drinks_analyzed: totalDrinks
      }
    });

  } catch (error) {
    console.error('Error generating recommendations:', error);

    if (error instanceof Error && error.message.includes('ANTHROPIC_API_KEY')) {
      return res.status(500).json({
        success: false,
        error: 'AI service not configured'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations'
    });
  }
});

export default router;
