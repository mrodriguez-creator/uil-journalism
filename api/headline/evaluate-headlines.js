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

  const { stories, headlines } = req.body;

  if (!stories || !headlines) {
    return res.status(400).json({ error: 'Missing stories or headlines' });
  }

  // Build the prompt with each story paired with its headline
  const pairsText = headlines.map((h, i) => {
    const storyText = stories[i] || '(no story)';
    const lines = h.lines.map((l, lineIndex) => {
      const role = l.role ? ` [${l.role}]` : '';
      return `  Line ${lineIndex + 1}${role}: "${l.text}" (${l.charCount} chars, required: ${l.minRequired}-${l.maxRequired})`;
    }).join('\n');
    const typeLabel = h.type === 'main+secondary' ? 'main + secondary' : h.totalLines + '-line';
    return `--- STORY ${i + 1} ---\n${storyText}\n\nHEADLINE ${h.headlineNumber} (${typeLabel}) — Assignment: ${h.label || ''}:\n${lines}`;
  }).join('\n\n');

  try {
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
          content: `You are a UIL Headline Writing judge. Grade these student headlines using the official UIL scoring rubric (0-4 points per headline). Each headline was written for its own separate story, just like in a real UIL contest.

${pairsText}

OFFICIAL UIL GRADING RUBRIC (0-4 POINTS):

**ZERO POINTS (Disqualified):**
- Over count or under count (if intentional error to fix count = DQ, other headlines get at least 1 point)
- The ONLY DQ is over/under count

**Give ONLY 1 POINT:**
- Misspellings
- Fact errors
- Passive voice verbs (is given, was studied, etc.)
- ALL verbs not written in present or future tense (OK: speak, will resign; NOT OK: spoke, resigned, -ed/-en ending)
- Past tense verbs get 1 point
- Labels (main headlines with NO verb - short hammers don't need verb but main headlines MUST have a verb)
- Repeated words in same headline
- Using ? & , ! and most abbreviations (months, states NOT correct as abbreviations)
- A, an, the (comma/period replace 'and') unless in book/movie titles
- Opinion (adjectives/adverbs) - red car is OK; sloppy is NOT
- 2-line or 3-line headline that doesn't read as 1 sentence
- First & last names together (use 1 name, NOT both)
- No text words, no slang, no say kids
- Don't confuse labels or titles with headlines (headlines have subject & present tense verb)
- Acronyms not used in story
- Use of Leaguetown, LHS or 'our school' (L-words not allowed in ANY UIL journalism)

**Give 2 POINTS:**
- Headline misses main idea
- First names used (with/out last name) - Exception: 2 people w/same last name
- Bad word splits, especially line 1 to line 2 (infinitive 'to' should not split from its object, nor a preposition from its object on 1 line with noun on next line)
- Per AP, word splits from line 2 to line 3 are acceptable, but from lines 1 to 2 are not
- JUDgiNG NOTE: In ties, bad word splits lose
- "Double quotation marks" - Use 'single marks only'
- Widely-known acronyms (YMCA) acceptable, but rarely. StuCo is not
- Comma separates 1 subj/2 vrbs BUT semicolon MUST separate 2 subjs + 2 vrbs = 2 different sentences

**Give 3 POINTS:**
- Summarizes main element of story fairly well with info taken from opening/lead paragraph
- Headlines should come from TOP/2 leads (first 2 paragraphs of story, not some insignificant details way down below)
- Subject + active present tense verb + direct object (when applicable)
- Headline is okay or correct, but not outstanding
- Facts, spelling and mechanics correct
- NOT trite or cutesy

**Give 4 POINTS:**
- A solid summary, maybe clever or play on words
- NAILS the lead/first 2 paragraphs with most important info; uses future element, NOT stale, old news
- Clearly tells the story, with every word needed
- Strong verb - Present Tense & Active Voice
- Mechanics, verb tense, facts, spelling correct

CRITICAL RULES TO ENFORCE:
1. ACTIVE VOICE REQUIRED: "Student wins award" NOT "Award won by student"
2. PRESENT/FUTURE TENSE: "Board approves" NOT "Board approved"
3. NO PASSIVE: "is given, was studied, been" = automatic 1 point
4. SUBJECT + VERB + OBJECT format
5. Multi-line headlines MUST read as ONE complete sentence
6. Don't split verb phrases awkwardly between lines
7. Use commas for 'and' - semicolons separate 2 complete clauses
8. No abbreviations unless in the story
9. Facts must match the specific story each headline is paired with
10. Use LAST names only (not first, not both)

ADDITIONAL RULES (from official UIL contest tips):
- Avoid starting the headline with a verb
- Use single quotes, NOT double quotes
- Avoid using the same word twice in a headline
- Avoid unfamiliar abbreviations
- Do not end the headline with a period or exclamation point
- A comma (,) can substitute for the word "and"
- Present perfect tense is also acceptable (e.g., "has earned")
- For main+secondary headline format: the main headline grabs attention (can be a pun, wordplay, or short phrase — does NOT need a verb when a secondary headline follows). The secondary headline provides the factual details with subject + verb + object.
- Match the tone: fun story = fun headline, serious story = serious headline
- Do not sacrifice accuracy for creativity or cuteness

NOTES:
- Block letters acceptable (no penalty)
- Use % sign, not word
- Single-digit numbers as words or digits (be consistent, don't BEGIN headline with digit)
- Upstyle OR downstyle capitalization are both acceptable

For each headline, provide:
- Score (0-4 using rubric above)
- What works well (if any)
- Specific improvements with rubric justification
- Suggested revision (if score < 4)

Format as JSON:
{
  "headlines": [
    {
      "number": 1,
      "score": 0-4,
      "strengths": ["strength1", "strength2"],
      "improvements": ["improvement1 (cite rubric category)", "improvement2"],
      "suggestedRevision": "better headline" or null,
      "feedback": "detailed explanation citing rubric"
    }
  ],
  "overallScore": 0-24,
  "overallFeedback": "summary of performance"
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
