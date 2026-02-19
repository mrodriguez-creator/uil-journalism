export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { part2Answers, part3Answer, testData } = req.body;

    if (!part2Answers || !part3Answer || !testData) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `You are a UIL Copy Editing judge scoring a student's test. Score Parts 2 and 3.

PART 2 SCORING (matches real UIL rules):
- Each sentence is worth 4 points maximum (1 point per error corrected)
- Each sentence has exactly 4 errors
- Award 1 point per error correctly identified and fixed
- Judges consider only the first 4 corrections. Extra corrections are ignored.
- If fixing one error creates another, it counts as one correction
- Be generous: if the student's fix addresses the error even if worded differently, give credit
- Total possible: 20 points (5 sentences x 4 points)

PART 2 ANSWER KEY:
${testData.part2.map((s, i) => `Sentence ${i + 1}:\n  Original: "${s.original}"\n  Correct: "${s.corrected}"\n  4 Errors: ${s.errors.join('; ')}`).join('\n\n')}

STUDENT'S PART 2 ANSWERS:
${part2Answers.map((a, i) => `Sentence ${i + 1}: "${a}"`).join('\n')}

PART 3 SCORING (tiebreaker — rank holistically, no point total):
- This is used only to break ties
- Judge holistically at three levels:
  1. Highest: Legal/ethical issues, dateline accuracy
  2. Middle: Sources, story flow, factual consistency
  3. Lowest: Grammar, spelling, punctuation, AP style
- The brief has ${testData.part3.errorCount} errors
- Report how many errors the student found and which they missed

PART 3 ANSWER KEY:
Original: "${testData.part3.original}"
Correct: "${testData.part3.corrected}"
Errors: ${testData.part3.errors.join('; ')}

STUDENT'S PART 3 ANSWER:
"${part3Answer}"

Return JSON:
{
  "part2Scores": [
    {
      "sentence": 1,
      "score": 3,
      "maxScore": 4,
      "errorsFound": ["errors they correctly fixed"],
      "errorsMissed": ["errors they missed"],
      "feedback": "Brief feedback"
    }
  ],
  "part3Result": {
    "errorsFound": ["list of errors they found"],
    "errorsMissed": ["list of errors they missed"],
    "errorsFoundCount": 8,
    "totalErrors": ${testData.part3.errorCount},
    "ranking": "Strong/Average/Weak",
    "feedback": "Holistic feedback on their editing"
  },
  "part2Total": 16,
  "overallFeedback": "2-3 sentence summary of strengths and areas to study"
}`
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Anthropic API error:', data);
      return res.status(response.status).json({ error: data.error?.message || 'API request failed' });
    }

    const content = data.content.find(item => item.type === 'text')?.text || '';

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const evaluation = JSON.parse(jsonMatch[0]);
      return res.status(200).json(evaluation);
    } else {
      return res.status(500).json({ error: 'Failed to parse evaluation' });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
