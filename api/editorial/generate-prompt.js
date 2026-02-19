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

    // Generate a realistic publication date (upcoming issue)
    const now = new Date();
    const daysAhead = Math.floor(Math.random() * 5) + 2;
    const pubDate = new Date(now.getTime() + daysAhead * 86400000);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
    const pubDateStr = days[pubDate.getDay()] + ', ' + months[pubDate.getMonth()] + ' ' + pubDate.getDate();

    // Randomize topic categories
    const allTopics = [
      'school policy on cell phones or technology use',
      'changes to dress code or uniform policy',
      'proposed schedule changes (block scheduling, later start times)',
      'cutting or adding extracurricular programs due to budget',
      'mandatory community service hours for graduation',
      'open campus lunch policy vs. closed campus',
      'school safety measures (metal detectors, clear backpacks, SROs)',
      'social media policy for students and athletes',
      'changes to grading policy (pass/fail, weighted GPA)',
      'adding or removing a graduation requirement',
      'renaming a school or removing mascot/imagery',
      'student parking fees or transportation changes',
      'vending machine and cafeteria food quality',
      'proposed new facility (stadium, fine arts center)',
      'teacher retention and pay raise proposals',
      'AI and academic integrity policy',
      'book challenges or library policy changes',
      'student journalist rights and prior review',
      'environmental policy (recycling, sustainability)',
      'attendance policy changes or truancy enforcement'
    ];
    const shuffled = allTopics.sort(() => Math.random() - 0.5);
    const topic = shuffled[0];

    // Randomize school size
    const schoolSizes = [700, 950, 1210, 1430, 1800, 2350, 3100, 4683];
    const schoolSize = schoolSizes[Math.floor(Math.random() * schoolSizes.length)];

    // Randomize number of quotes
    const numQuotes = Math.floor(Math.random() * 2) + 4; // 4-5 quotes

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
          content: `[Seed: ${seed}] Create a UIL Editorial Writing contest prompt matching the EXACT format of the real Texas UIL Editorial Writing contest.

=== FORMAT REQUIREMENTS ===

The prompt is a FACT SHEET that gives students information about a school policy issue at Leaguetown High School. Students must read the fact sheet and write a staff editorial for the school newspaper (the Leaguetown Press) taking a clear stance FOR or AGAINST the proposal/action.

The fact sheet must include:
1. A header paragraph with school context (enrollment: ${schoolSize} students, grades 9-12)
2. A clear situation/proposal involving: ${topic}
3. Background facts and context (2-3 paragraphs of factual information)
4. A timeline — a vote, meeting, or decision is happening SOON. The newspaper issue date is ${pubDateStr}. The event should be 1-2 days AFTER the publication date.
5. A section: "THOSE SUPPORTING THE PROPOSAL" (2-3 sentences summarizing the pro side)
6. A section: "THOSE OPPOSING THE PROPOSAL" (2-3 sentences summarizing the con side)
7. ${numQuotes} named source quotes (with title/role), each 80-150 words. Mix of:
   - An administrator or superintendent
   - A parent
   - A student
   - A teacher
   - Optionally: a community member, board member, or expert

=== REAL EXAMPLE STRUCTURE ===

Here's how a real UIL editorial prompt is structured:

"Leaguetown High School has 1,430 students enrolled in grades 9-12. Last year, voters in the district rejected a proposed tax increase to resolve a $1.5 million budget deficit. To attempt to resolve the budget shortfall, Superintendent Mike Timms proposed a new open enrollment policy..."

[Background paragraphs with facts, numbers, timeline]

"THOSE SUPPORTING THE PROPOSAL
Without finding a major source of additional funding, the district could be forced to cut programs..."

"THOSE OPPOSING THE PROPOSAL
A significant increase in class size could have a negative impact on student success..."

[Then 4-5 NAMED quotes with titles, each a paragraph long]

=== IMPORTANT RULES ===
- The topic must be genuinely debatable — both sides should have strong arguments
- Include specific numbers, dates, and details that students can reference
- The quotes should provide different perspectives and specific details students can use
- Names should be realistic and diverse
- The vote/meeting should happen 1-2 days AFTER the paper's publication date (${pubDateStr})
- Do NOT include any sample editorial or instructions — just the fact sheet

Return as JSON:
{
  "topic": "Brief topic description",
  "publicationDate": "${pubDateStr}",
  "schoolSize": ${schoolSize},
  "factSheet": "The complete fact sheet text with all paragraphs, supporting/opposing sections, and quotes. Use \\n\\n for paragraph breaks. Use ■ before each quote source name.",
  "eventDate": "The date of the vote/meeting/decision",
  "keyQuestion": "One sentence framing the central question students must take a stance on"
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
      const promptData = JSON.parse(jsonMatch[0]);
      if (promptData.factSheet && promptData.topic) {
        return res.status(200).json(promptData);
      } else {
        return res.status(500).json({ error: 'Invalid prompt format' });
      }
    } else {
      return res.status(500).json({ error: 'Failed to parse prompt data' });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
