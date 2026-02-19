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

    // Event date is 1-2 days after publication
    const eventDaysAfter = Math.floor(Math.random() * 2) + 1;
    const eventDate = new Date(pubDate.getTime() + eventDaysAfter * 86400000);
    const eventDateStr = days[eventDate.getDay()] + ', ' + months[eventDate.getMonth()] + ' ' + eventDate.getDate();

    // Randomize topic categories — school news events matching real UIL prompts
    const allTopics = [
      'school board vote on budget cuts affecting programs and teacher positions',
      'proposal to add free dinner program for students at school',
      'new school safety measures including metal detectors and clear backpacks',
      'school board considering later start times for high school',
      'district proposal to close neighborhood elementary schools due to declining enrollment',
      'vote on new open enrollment policy allowing students from other districts',
      'school board vote on building a new stadium or fine arts center',
      'proposal to require community service hours for graduation',
      'changes to student parking policy and fees',
      'new cell phone and technology use policy during school hours',
      'proposal to add career and technical education programs',
      'school board vote on teacher pay raise funded by bond election',
      'district considering switching to block scheduling',
      'vote on new dress code or uniform policy',
      'proposal to renovate aging school facilities',
      'district considering adding dual credit partnerships with local college',
      'school board vote on vaping and substance abuse prevention program',
      'proposal to create a new student mental health support center',
      'vote on whether to rename school or change mascot',
      'district proposal for an AI and academic integrity policy'
    ];
    const shuffled = allTopics.sort(() => Math.random() - 0.5);
    const topic = shuffled[0];

    // Randomize school size
    const schoolSizes = [700, 950, 1210, 1430, 1800, 2350, 3100, 4480, 4734];
    const schoolSize = schoolSizes[Math.floor(Math.random() * schoolSizes.length)];

    // Number of source quotes (4-5 like real UIL tests)
    const numQuotes = Math.floor(Math.random() * 2) + 4;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 5000,
        messages: [{
          role: 'user',
          content: `[Seed: ${seed}] Create a UIL News Writing contest prompt matching the EXACT format of the real Texas UIL News Writing contest.

=== FORMAT REQUIREMENTS ===

The prompt is a FACT SHEET that gives students raw information about a school news event at Leaguetown High School. Students must read the fact sheet and write a news story in inverted pyramid format for the school newspaper (the Leaguetown Press).

The fact sheet MUST follow this EXACT structure (matching real UIL tests):

1. OPENING PARAGRAPH — School context:
"Leaguetown High School has ${schoolSize} students enrolled in grades 9-12."
Then 2-4 paragraphs of BACKGROUND FACTS about the situation: ${topic}
Include specific numbers, dates, statistics, dollar amounts, vote counts, etc.

2. TIMELINE — A key event (vote, meeting, announcement, implementation) is happening on ${eventDateStr}. Include the sentence:
"You are writing for the issue of the press to be distributed ${pubDateStr}."

3. NAMED SOURCE QUOTES — ${numQuotes} sources, each formatted EXACTLY like real UIL tests:
■  FIRSTNAME LASTNAME, title/role
"Full quote text that is 60-150 words. May span multiple paragraphs within the quote. Include specific details, opinions, and information students can use as direct or indirect quotes."

The sources should include a MIX of:
- An administrator or superintendent (always include one)
- 1-2 students (with grade level: sophomore, junior, senior)
- A teacher or coach
- A parent
- Optionally: a board member, counselor, or community member

4. ■  ADDITIONAL INFORMATION — 1-2 sentences of broader context (state/national stats, legislation, etc.)

=== REAL UIL EXAMPLE STRUCTURE (State 2025) ===

"Leaguetown High School has 4,480 students enrolled in grades 9-12.
In March, the district announced that it anticipated an $18 million budget shortfall ahead of the 2025-2026 school year.
[Several paragraphs of factual background about the situation]
You are writing for the issue of the press to be distributed May 19.

■  LESLIE BRUCK, superintendent
"It's true that things in our district..."
[Long quote with specific details]

■  LYDIA BUSBY, chief financial officer
"Our task force has met for about three hours every week..."

■  SAM LONSDALE, sophomore
"AVID stands for Advancement Via Individual Determination..."

■  SUSAN BELL, English teacher
"Since this announcement in March, there has been a dark cloud hanging over the school..."

■  GREGORY ALAN, parent
"I have one son who goes to Sadler Elementary..."

■  ADDITIONAL INFORMATION
In Texas, schools are funded based on daily average attendance..."

=== IMPORTANT RULES ===
- This is a NEWS prompt, NOT an editorial — there is NO "supporting" or "opposing" section
- The fact sheet gives raw information and quotes; students must organize it into a news story
- Include MORE information than needed — students must exercise news judgment
- Each quote should be substantial (60-150 words) with specific details
- Include at least one quote that has multiple paragraphs (use \\n in the quote)
- Names should be realistic and diverse
- Include specific numbers: dollar amounts, percentages, dates, enrollment figures
- The most timely/newsworthy angle should relate to the upcoming event on ${eventDateStr}
- Do NOT include any sample story, tips, or writing instructions — just the fact sheet

Return as JSON:
{
  "topic": "Brief 3-5 word topic description",
  "publicationDate": "${pubDateStr}",
  "eventDate": "${eventDateStr}",
  "schoolSize": ${schoolSize},
  "factSheet": "The complete fact sheet text. Use \\n\\n for paragraph breaks. Use ■ before each source name. Format quotes with the source header on its own line.",
  "keyAngle": "One sentence describing the most timely news angle students should lead with",
  "sourceCount": ${numQuotes}
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
