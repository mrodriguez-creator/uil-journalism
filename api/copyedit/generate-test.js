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
    const seed = Math.floor(Math.random() * 1000000);

    // Randomize AP style topics to test
    const apTopics = [
      'number usage (spell out one-nine, use figures for 10+)',
      'month abbreviations (Jan., Feb., Aug., Sept., Oct., Nov., Dec. with dates; spell out March, April, May, June, July)',
      'title capitalization (capitalize before name, lowercase after or standalone)',
      'time format (use figures with a.m./p.m., use noon/midnight not 12 p.m./12 a.m.)',
      'state names (spell out in body text)',
      'commas in a series (no Oxford comma in AP style)',
      'ages (always use figures, hyphenate when used as adjective)',
      'composition titles (use quotation marks, not italics)',
      'abbreviations of street addresses (Ave., Blvd., St. with numbered address)',
      'seasons (lowercase spring, summer, fall, winter)',
      'academic degrees (lowercase general: bachelor\'s degree; capitalize formal: Bachelor of Science)',
      'directions vs regions (capitalize South as region, lowercase southern as adjective)',
      'percent (use figures with the word percent, not % symbol)',
      'decades (1990s no apostrophe, \'90s with apostrophe)'
    ];
    const shuffledTopics = apTopics.sort(() => Math.random() - 0.5);
    const focusTopics = shuffledTopics.slice(0, 6).join(', ');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        messages: [{
          role: 'user',
          content: `[Generation seed: ${seed}] You are creating a UIL (University Interscholastic League) Copy Editing practice test for Texas high school journalism students. The test has THREE parts and must be completable in 15 minutes.

PART 1 — MULTIPLE CHOICE (15 questions, 1 point each)
Create 15 multiple-choice questions testing AP style, grammar, punctuation, and word usage. Each question gives a sentence or phrase with 4 answer choices (A, B, C, D). Only ONE is correct.

Focus on these AP style areas: ${focusTopics}

Also include questions on:
- Commonly confused words (its/it's, their/there/they're, affect/effect, who's/whose, lay/lie, principal/principle, than/then, fewer/less, who/whom)
- Subject-verb agreement
- Comma usage (introductory phrases, appositives, compound sentences)
- Pronoun-antecedent agreement
- Quotation mark placement with other punctuation

PART 2 — SENTENCE EDITING (5 sentences, 2 points each = 10 points)
Create 5 sentences, each containing EXACTLY 4 errors. Errors should be a mix of:
- AP style violations
- Grammar mistakes
- Spelling errors
- Punctuation errors
- Wordiness that should be tightened

For each sentence, provide the original (with errors) and a corrected version.

PART 3 — NEWS BRIEF EDITING (1 paragraph, tiebreaker)
Create a short news brief (80-120 words) about a Leaguetown High School event. Embed 8-12 errors including AP style, grammar, spelling, punctuation, wordiness, and at least one factual consistency error (like a name spelled differently in two places, or a conflicting number).

Provide the original (with errors) and a fully corrected version.

CRITICAL: Make all content feel like real high school newspaper writing about Leaguetown High School / Leaguetown Press.

Return as JSON:
{
  "part1": [
    {
      "question": "Which sentence uses correct AP style?",
      "choices": ["A) sentence...", "B) sentence...", "C) sentence...", "D) sentence..."],
      "correct": 1,
      "explanation": "Brief explanation of why this is correct"
    }
  ],
  "part2": [
    {
      "original": "The sentence with 4 errors in it.",
      "corrected": "The corrected sentence.",
      "errors": ["error 1 description", "error 2 description", "error 3 description", "error 4 description"]
    }
  ],
  "part3": {
    "original": "The news brief with 8-12 errors...",
    "corrected": "The fully corrected news brief...",
    "errors": ["error 1", "error 2", "..."],
    "errorCount": 10
  }
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
      const testData = JSON.parse(jsonMatch[0]);
      // Validate structure
      if (testData.part1 && testData.part2 && testData.part3 &&
          Array.isArray(testData.part1) && testData.part1.length === 15 &&
          Array.isArray(testData.part2) && testData.part2.length === 5) {
        return res.status(200).json(testData);
      } else {
        return res.status(500).json({ error: 'Invalid test format: expected 15 Part 1 questions and 5 Part 2 sentences' });
      }
    } else {
      return res.status(500).json({ error: 'Failed to parse test data' });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
