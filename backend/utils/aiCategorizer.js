const CATEGORY_RULES = [
  {
    category: 'Infrastructure - Washroom',
    terms: ['washroom', 'toilet', 'bathroom', 'leak', 'flush', 'sink', 'drain'],
  },
  {
    category: 'Infrastructure - Power/Electricity',
    terms: ['electric', 'power', 'light', 'fan', 'switch', 'wire', 'outage'],
  },
  {
    category: 'Infrastructure - Water Supply',
    terms: ['water', 'tap', 'drinking', 'pipeline', 'supply'],
  },
  {
    category: 'Infrastructure - Classroom',
    terms: ['classroom', 'bench', 'desk', 'projector', 'board', 'chair'],
  },
  {
    category: 'Service - Mess/Cafeteria',
    terms: ['mess', 'food', 'cafeteria', 'canteen', 'meal', 'hygiene'],
  },
  {
    category: 'Service - Transport/Bus',
    terms: ['bus', 'transport', 'driver', 'route', 'stop'],
  },
  {
    category: 'Technical - Wi-Fi/Network',
    terms: ['wifi', 'wi-fi', 'network', 'internet', 'router', 'lan'],
  },
  {
    category: 'Technical - Lab System Issue',
    terms: ['lab', 'computer', 'pc', 'keyboard', 'mouse', 'monitor'],
  },
  {
    category: 'Billing - Fee Payment',
    terms: ['fee', 'payment', 'transaction', 'receipt', 'refund'],
  },
];

function heuristicSuggestCategory(description = '') {
  const text = description.toLowerCase();
  const scored = CATEGORY_RULES.map((rule) => ({
    category: rule.category,
    hits: rule.terms.filter((term) => text.includes(term)).length,
  })).sort((a, b) => b.hits - a.hits);

  const best = scored[0];
  if (!best || best.hits === 0) {
    return {
      category: '',
      confidence: 0,
      reason: 'No strong category signal found',
      source: 'heuristic',
    };
  }

  return {
    category: best.category,
    confidence: Math.min(92, 55 + best.hits * 15),
    reason: `Matched ${best.hits} issue keyword${best.hits > 1 ? 's' : ''}`,
    source: 'heuristic',
  };
}

async function openAiSuggestCategory({ description, imageDataUrls = [] }) {
  if (!process.env.OPENAI_API_KEY) return null;

  const content = [
    {
      type: 'text',
      text: `Classify this campus complaint into one category. Return only JSON with category, confidence 0-100, and reason. Description: ${description}`,
    },
    ...imageDataUrls.slice(0, 2).map((url) => ({
      type: 'image_url',
      image_url: { url },
    })),
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You classify university complaints using the exact category labels from the application.',
        },
        {
          role: 'user',
          content,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI categorization failed with ${response.status}`);
  }

  const payload = await response.json();
  const parsed = JSON.parse(payload.choices?.[0]?.message?.content || '{}');

  return {
    category: String(parsed.category || ''),
    confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)),
    reason: String(parsed.reason || 'Suggested by GPT vision analysis'),
    source: 'openai',
  };
}

async function suggestCategory({ description, imageDataUrls = [] }) {
  try {
    const openAiSuggestion = await openAiSuggestCategory({ description, imageDataUrls });
    if (openAiSuggestion?.category) return openAiSuggestion;
  } catch (error) {
    console.warn(error.message);
  }

  return heuristicSuggestCategory(description);
}

module.exports = {
  suggestCategory,
  heuristicSuggestCategory,
};
