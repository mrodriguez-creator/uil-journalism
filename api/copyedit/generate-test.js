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

    // Generate a realistic publication date (upcoming Friday)
    const now = new Date();
    const daysUntilFri = (5 - now.getDay() + 7) % 7 || 7;
    const pubDate = new Date(now.getTime() + daysUntilFri * 86400000);
    const months = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
    const pubDateStr = 'Friday, ' + months[pubDate.getMonth()] + ' ' + pubDate.getDate() + ', ' + pubDate.getFullYear();

    // Randomize which AP style areas to focus on
    const allTopics = [
      'commonly confused words (its/it\'s, their/there/they\'re, affect/effect, principal/principle, than/then, fewer/less)',
      'AP time format (figures with lowercase a.m./p.m., use noon/midnight not 12 p.m./12 a.m.)',
      'AP number rules (spell out one-nine, figures for 10+, always figures for ages)',
      'AP month abbreviations (Jan., Feb., Aug., Sept., Oct., Nov., Dec. with dates only; never abbreviate March, April, May, June, July)',
      'title/job capitalization (capitalize formal title before name, lowercase after name or standalone)',
      'AP state rules (spell out state names in text, no abbreviations)',
      'composition titles (quotation marks not italics for books, movies, songs)',
      'abbreviations (FBI not F.B.I., TV not T.V., U.S. as adjective)',
      'subject-verb agreement',
      'percent (figures + "percent" spelled out, not % symbol)',
      'seasons lowercase (spring, summer, fall, winter)',
      'AP comma rules (no Oxford comma in simple series)',
      'court/government names (Fifth Circuit, City Council, board of regents)',
      'academic terms (junior/senior lowercase, bachelor\'s degree lowercase)',
      'spelling commonly misspelled words (cemetery, misspelling, occurred, judgment)',
      'possessives (Texas\' or its, not it\'s for possessive)',
      'nationwide/one-time/everyday vs every day compound words',
      'AP date format (no -st, -nd, -rd, -th with dates)'
    ];
    const shuffled = allTopics.sort(() => Math.random() - 0.5);
    const focusAreas = shuffled.slice(0, 8).join('\n- ');

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
          content: `[Seed: ${seed}] Create a UIL Copy Editing practice test matching the EXACT format of the real Texas UIL Copy Editing contest. Publication date: ${pubDateStr}.

=== PART 1: CIRCLE THE CORRECT RESPONSE (15 questions, 1 point each) ===

Each question is a sentence or phrase with 2-4 INLINE answer options separated by " / ". The student circles the correct one. This is NOT traditional A/B/C/D format — the options appear WITHIN the sentence.

REAL EXAMPLES of the exact format:
- "The gratitude for veterans is clear in the cemetery / cemetary / cematary."
- "Kamala Harris has a 3 AM / 3 A.M. / 3 a.m. / 3 o'clock in the morning meeting."
- "Monday, Oct. 7 / October 7 / OCT 7, was the last day to register to vote."
- "The F.B.I.'s / FBI's report showed 2,500 fewer homicides."
- "The board of regents amended its / it's / its' free speech policy."
- "Florida high school junior / Junior Holly Neher threw for a touchdown."
- "For the 9th / ninth straight month, Earth obliterated heat records."
- "The new high school principal / Principal / principle established a friendly culture."
- "She was eliminated after mispelling / misspelling / misspeling 'orle.'"
- "In Texas, the top 10 percent / Percent / % automatically get admitted."
- "The production of Q-Tips / Q tips / Q-tips will now be in Puerto Rico."
- "The book was titled / entitled 'We'll Prescribe You a Cat.'"

Focus on these areas:
- ${focusAreas}

Create 15 NEW questions in this exact inline-options format. Use current events, real-world references, and school journalism contexts. Each must have exactly ONE correct answer.

=== PART 2: EDIT THE SENTENCES (5 sentences, 4 points each = 20 points) ===

Create 5 sentences, each containing EXACTLY 4 errors. Mix of AP style, grammar, spelling, punctuation, and wordiness. Context: editing for the Leaguetown High School (Texas) Press, ${pubDateStr}.

REAL EXAMPLES:
- "Despite they're best efforts, neither the teacher or the students was able to finish the project on time because they had began too late" (their, nor, were, begun + period)
- "She go to the store on indigenous peoples day too buy some milk, but it was closed." (went, Indigenous Peoples Day, to, the store→a store or remove wordiness)
- "A grand jury indicted the school principles for allegedly using there school e-mails too encourage staff to vote" (principals, their, emails, to)

Each sentence should be 1-3 lines, testing different error combinations. Provide the original WITH errors and a corrected version.

=== PART 3: EDIT A NEWS BRIEF (tiebreaker, not scored by points) ===

Create a news brief of 150-250 words based on a REAL-WORLD style Texas news story (NOT about Leaguetown — use a real Texas city). Include 10-15 embedded errors: AP style violations, grammar, spelling, punctuation, wordiness, and at least one factual consistency issue (name spelled two ways, conflicting numbers, wrong date logic based on publication date).

Students edit the brief for publication in the Leaguetown High School (Texas) Press, ${pubDateStr}.

REAL EXAMPLE STYLE: A modified Texas Tribune article about boil-water notices in Laredo, a police case in Eagle Pass, etc. The dateline should be a real Texas city.

Return as JSON:
{
  "publicationDate": "${pubDateStr}",
  "part1": [
    {
      "sentence": "The sentence with options / separated / like this.",
      "options": ["option1", "option2", "option3"],
      "correctIndex": 0,
      "explanation": "Why this is correct"
    }
  ],
  "part2": [
    {
      "original": "Sentence with exactly 4 errors in it.",
      "corrected": "Corrected sentence.",
      "errors": ["error 1: description", "error 2: description", "error 3: description", "error 4: description"]
    }
  ],
  "part3": {
    "original": "Full news brief with 10-15 errors embedded...",
    "corrected": "Fully corrected news brief...",
    "errors": ["error 1", "error 2", "..."],
    "errorCount": 12
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
