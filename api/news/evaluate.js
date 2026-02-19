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
    const { story, promptData } = req.body;

    if (!story || !story.trim()) {
      return res.status(400).json({ error: 'No story submitted' });
    }

    const wordCount = story.trim().split(/\s+/).length;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3500,
        messages: [{
          role: 'user',
          content: `You are a UIL News Writing judge evaluating a high school student's news story. Judge this story using the official UIL News Writing evaluation criteria and Bobby Hawthorne's checklist.

=== FACT SHEET GIVEN TO STUDENT ===
Topic: ${promptData.topic}
Publication date: ${promptData.publicationDate}
Event date: ${promptData.eventDate}
Key angle: ${promptData.keyAngle}

${promptData.factSheet}

=== STUDENT'S NEWS STORY ===
(Word count: ${wordCount})

${story}

=== EVALUATION CRITERIA ===

Judge this news story on each of the following criteria using a 1-10 scale:

1. **LEAD QUALITY (1-10):** Does the lead identify the most timely, newsworthy angle? Is it a strong summary lead covering the key W's (Who, What, When, Where, Why/How)? Is it concise (25-35 words)? Does it focus on the FUTURE event (what's coming up) rather than just background? A great lead starts with What or Who, not When or Where.

2. **INVERTED PYRAMID (1-10):** Is information organized from most important to least important? Could the last paragraph or two be cut without damaging the story's meaning? Does the story flow logically with each paragraph building on the one before it?

3. **QUOTES & ATTRIBUTION (1-10):** Does the writer use direct quotes effectively and early in the story? Is the attribution format correct (noun then verb: "Smith said" NOT "said Smith")? Are quotes properly punctuated? Does the writer use the transition-quote-transition-quote (LQTQ) formula? Are quotes NOT stacked (no two quotes from different sources back-to-back without a transition)?

4. **NEWS JUDGMENT (1-10):** Did the writer select the most important information from the fact sheet? Did they identify the right sources to quote? Did they exercise good judgment about what to include and what to leave out? Is the story balanced and complete?

5. **WRITING QUALITY (1-10):** Is the writing clear, concise, and well-organized? Are paragraphs short (1-2 sentences each, journalism style)? Is sentence structure varied? Is the story free of grammar, spelling, and AP style errors? Is the vocabulary appropriate?

6. **AP STYLE & MECHANICS (1-10):** Are numbers, dates, titles, and abbreviations formatted per AP style? Are names spelled correctly from the fact sheet? Is punctuation correct (no Oxford comma, proper quote punctuation)? Are there any factual errors?

7. **OBJECTIVITY & VOICE (1-10):** Does the writer maintain third person throughout (no "our school," "we," "I")? Is the story free of editorializing and personal opinion? Are all opinions attributed to sources? Is the tone appropriate for a news story?

=== IMPORTANT JUDGING NOTES ===
- The story should NOT use first person (I, we, our) or second person (you)
- The story should NOT editorialize or include unattributed opinions
- Attribution format must be "Name said" NOT "said Name"
- Paragraphs should be short — 1-2 sentences (journalism style)
- Direct quotes should be their own paragraphs
- Transitions between quotes should provide new information, not repeat what the quote says
- The lead should focus on the most timely angle (usually the upcoming event)
- Misspelling names from the fact sheet is a significant error
- The story should end with a strong closing quote

Return as JSON:
{
  "scores": {
    "lead": { "score": 8, "feedback": "Specific feedback about the lead" },
    "pyramid": { "score": 7, "feedback": "Specific feedback about structure" },
    "quotes": { "score": 6, "feedback": "Specific feedback about quotes and attribution" },
    "judgment": { "score": 7, "feedback": "Specific feedback about news judgment" },
    "writing": { "score": 8, "feedback": "Specific feedback about writing quality" },
    "apStyle": { "score": 7, "feedback": "Specific feedback about AP style" },
    "objectivity": { "score": 7, "feedback": "Specific feedback about objectivity" }
  },
  "totalScore": 50,
  "maxScore": 70,
  "overallRanking": "Strong / Average / Needs Work",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "overallFeedback": "2-3 sentence overall assessment",
  "leadSuggestion": "A suggested stronger lead for this story (1-2 sentences)",
  "factualErrors": ["any factual errors or misspelled names"],
  "styleErrors": ["any AP style errors found"],
  "structureNotes": ["any notes about stacked quotes, missing transitions, etc."]
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
