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
          content: `You are evaluating a student's UIL Copy Editing test. Score their Part 2 and Part 3 answers.

PART 2 SCORING RULES:
- Each sentence is worth 2 points maximum
- Each sentence has exactly 4 errors
- Award 0.5 points per error correctly identified and fixed
- If the student introduces NEW errors, deduct 0.5 points per new error (minimum 0 for that sentence)
- Be generous: if the student's correction fixes the intent of the error even if worded slightly differently, give credit

PART 2 ORIGINAL SENTENCES AND CORRECT ANSWERS:
${testData.part2.map((s, i) => `Sentence ${i + 1}:\n  Original: "${s.original}"\n  Correct: "${s.corrected}"\n  Errors: ${s.errors.join('; ')}`).join('\n\n')}

STUDENT'S PART 2 ANSWERS:
${part2Answers.map((a, i) => `Sentence ${i + 1}: "${a}"`).join('\n')}

PART 3 SCORING RULES:
- The news brief has ${testData.part3.errorCount} errors
- Award 1 point per error correctly found and fixed
- Deduct 0.5 points per new error introduced (minimum 0)
- Maximum score: ${testData.part3.errorCount} points

PART 3 ORIGINAL AND CORRECT:
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
      "score": 1.5,
      "maxScore": 2,
      "errorsFound": ["error they found 1", "error they found 2"],
      "errorsMissed": ["error they missed"],
      "newErrors": [],
      "feedback": "Brief feedback"
    }
  ],
  "part3Score": {
    "score": 7,
    "maxScore": ${testData.part3.errorCount},
    "errorsFound": ["list of errors they found"],
    "errorsMissed": ["list of errors they missed"],
    "newErrors": [],
    "feedback": "Brief overall feedback"
  },
  "part2Total": 7.5,
  "part3Total": 7,
  "overallFeedback": "2-3 sentence summary of strengths and what to work on"
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
