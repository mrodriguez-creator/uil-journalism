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
    const { editorial, promptData } = req.body;

    if (!editorial || !editorial.trim()) {
      return res.status(400).json({ error: 'No editorial submitted' });
    }

    const wordCount = editorial.trim().split(/\s+/).length;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: `You are a UIL Editorial Writing judge evaluating a high school student's editorial. Judge this editorial using the official UIL Editorial Writing evaluation criteria.

=== FACT SHEET GIVEN TO STUDENT ===
Topic: ${promptData.topic}
Publication date: ${promptData.publicationDate}
Key question: ${promptData.keyQuestion}

${promptData.factSheet}

=== STUDENT'S EDITORIAL ===
(Word count: ${wordCount})

${editorial}

=== EVALUATION CRITERIA ===

Judge this editorial on each of the following criteria using a 1-10 scale:

1. **STANCE & LEAD (1-10):** Does the editorial lead with a clear statement of the situation and take a definitive staff stance in the first few paragraphs? The stance should be unmistakable.

2. **SUPPORTING ARGUMENTS (1-10):** Does the writer support the stance with specific examples, facts, and evidence from the fact sheet? Are there at least 2-3 strong reasons?

3. **REBUTTAL OF OPPOSITION (1-10):** Does the writer acknowledge and effectively refute the opposing viewpoint using specific examples?

4. **SOLUTION (1-10):** Does the editorial offer a specific, actionable solution or call to action? Does it complete the argument?

5. **WRITING QUALITY (1-10):** Is the writing clear, concise, and well-organized? Is it free of grammar, spelling, and AP style errors? Is the tone appropriate (no sermonizing, no first person singular)?

6. **USE OF INFORMATION (1-10):** Does the writer effectively use facts, quotes, and details from the fact sheet? Are there factual errors?

7. **VOICE & PERSUASION (1-10):** Does the editorial use first person plural (we, the staff)? Is it persuasive without being preachy? Is it an appropriate length (around 300-450 words)?

=== IMPORTANT JUDGING NOTES ===
- The editorial should NOT use first person singular (I, me, mine) or second person (you)
- The editorial should use first person plural (we = the newspaper staff) or third person
- Direct quotes from the fact sheet should be AVOIDED — paraphrase instead
- The editorial should NOT be longer than about 450 words
- Look for a future angle — the paper comes out before the meeting/vote
- The editorial should NOT ask questions — it should answer them
- The editorial should NOT sermonize or lecture

Return as JSON:
{
  "scores": {
    "stance": { "score": 8, "feedback": "Specific feedback" },
    "arguments": { "score": 7, "feedback": "Specific feedback" },
    "rebuttal": { "score": 6, "feedback": "Specific feedback" },
    "solution": { "score": 7, "feedback": "Specific feedback" },
    "writing": { "score": 8, "feedback": "Specific feedback" },
    "information": { "score": 7, "feedback": "Specific feedback" },
    "voice": { "score": 7, "feedback": "Specific feedback" }
  },
  "totalScore": 50,
  "maxScore": 70,
  "overallRanking": "Strong / Average / Needs Work",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "overallFeedback": "2-3 sentence overall assessment",
  "factualErrors": ["any factual errors found"],
  "styleErrors": ["any AP style or grammar errors found"]
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
      const evalData = JSON.parse(jsonMatch[0]);
      evalData.wordCount = wordCount;
      return res.status(200).json(evalData);
    } else {
      return res.status(500).json({ error: 'Failed to parse evaluation' });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
