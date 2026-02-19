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
          content: `You are a UIL Feature Writing judge evaluating a high school student's feature story. Judge this story using the official UIL Feature Writing evaluation criteria and the contest tips provided in real UIL tests.

=== FACT SHEET GIVEN TO STUDENT ===
Topic: ${promptData.topic}
Story focus: ${promptData.storyFocus || 'Human interest feature story'}
Publication date: ${promptData.publicationDate}
Event date: ${promptData.eventDate}

${promptData.factSheet}

=== STUDENT'S FEATURE STORY ===
(Word count: ${wordCount})

${story}

=== EVALUATION CRITERIA ===

Judge this feature story on each of the following criteria using a 1-10 scale:

1. **LEAD / HOOK (1-10):** Does the lead grab the reader's attention? A feature lead should NOT be a standard summary lead. It should set a scene, paint a picture, create a moment, use irony, or hook the reader with a compelling detail. The lead should draw the reader INTO the story. Does it stay close to the prompt without wandering too far? A great lead often uses a specific detail or moment from the fact sheet to create a vivid opening.

2. **NUT GRAPH & STRUCTURE (1-10):** After the creative lead, does the story include a clear nut graph that tells the reader what the story is about? This is the summary paragraph that orients the reader. After the nut graph, does the story follow the transition-quote formula effectively? Is the overall structure logical and does it flow well?

3. **QUOTES & ATTRIBUTION (1-10):** Does the writer use direct quotes effectively? Is attribution format correct (noun then verb: "Smith said" NOT "said Smith")? Are quotes properly punctuated? Does the writer use good transitions between quotes (not stacking quotes from different sources back-to-back)? Does the writer use the verb "said" (not "says," "stated," "feels," etc.)?

4. **STORYTELLING & HUMAN ELEMENT (1-10):** Does the story capture the human element? Does it make the reader FEEL something? Does the writer bring the subject to life? Does the story have a clear theme or focus? Is descriptive, narrative writing used effectively? Does the story go beyond just reporting facts to tell a compelling human story?

5. **WRITING QUALITY (1-10):** Is the writing clear, concise, and well-organized? Are paragraphs short (1-2 sentences, journalism style)? Is sentence structure varied? Is the vocabulary vivid and appropriate? Are transitions smooth and informative?

6. **AP STYLE & MECHANICS (1-10):** Are numbers, dates, titles, and abbreviations formatted per AP style? Are names spelled correctly from the fact sheet? Is punctuation correct (no Oxford comma, proper quote punctuation)? Are there any grammar or spelling errors?

7. **OBJECTIVITY & VOICE (1-10):** Does the writer maintain third person throughout (no "our school," "we," "I")? Is the story free of editorializing and personal opinion? Are all opinions attributed to sources? Does the story show the subject's character through quotes and actions rather than the writer telling the reader what to think?

=== IMPORTANT FEATURE WRITING JUDGING NOTES ===
- Feature leads should be CREATIVE, not summary leads. A standard news lead ("The school will..." or "A teacher was honored...") is weak for a feature.
- A nut graph MUST appear after the lead to ground the reader
- The story should NOT use first person (I, we, our) or second person (you) outside quotes
- The story should NOT editorialize ("amazing," "incredible," "inspiring") — let the story speak for itself
- Attribution must use "said" (not "says," "stated," "feels," "expressed")
- Attribution format must be "Name said" NOT "said Name"
- Paragraphs should be short — 1-2 sentences
- The story should end with a strong closing quote that brings resolution or circles back to the beginning
- Misspelling names from the fact sheet is a significant error
- The writer should select the best quotes and details, not try to use everything

Return as JSON:
{
  "scores": {
    "lead": { "score": 8, "feedback": "Specific feedback about the lead/hook" },
    "structure": { "score": 7, "feedback": "Specific feedback about nut graph and structure" },
    "quotes": { "score": 6, "feedback": "Specific feedback about quotes and attribution" },
    "storytelling": { "score": 7, "feedback": "Specific feedback about human element and storytelling" },
    "writing": { "score": 8, "feedback": "Specific feedback about writing quality" },
    "apStyle": { "score": 7, "feedback": "Specific feedback about AP style and mechanics" },
    "objectivity": { "score": 7, "feedback": "Specific feedback about objectivity and voice" }
  },
  "totalScore": 50,
  "maxScore": 70,
  "overallRanking": "Strong / Average / Needs Work",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "overallFeedback": "2-3 sentence overall assessment",
  "leadSuggestion": "A suggested stronger feature lead for this story (2-4 sentences showing a creative, scene-setting approach)",
  "factualErrors": ["any factual errors or misspelled names"],
  "styleErrors": ["any AP style errors found"],
  "structureNotes": ["any notes about stacked quotes, missing nut graph, weak closing, etc."]
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
