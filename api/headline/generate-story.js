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
    // Randomize topic selection and seed so each generation is unique
    const allTopics = [
      'New school programs/classes (AI class, culinary program, automotive tech, chamber orchestra, marine biology, cybersecurity course)',
      'Student clubs and organizations (politics club, grief club, garden club, creative writing club, chess team, robotics club)',
      'Community service projects (food drives, cheer clinics for charity, free lunches for summer, Habitat for Humanity builds, blood drives)',
      'Competitions and achievements (Science Olympics, film festival, baking contest, fencing championship, debate tournament, math decathlon)',
      'School events (prom theme voting, pickle fair, open mic night, food truck festival, taste testing, homecoming week, talent show)',
      'Policy changes (cell phone policy, dress code, attendance incentives, longer school day, bus route cuts, vending machine changes)',
      'Fundraisers (Country Gala, yoga classes for trip money, project graduation, car wash marathon, silent auction)',
      'Donations and partnerships (solar panels, auto parts donation, bird-safe windows, local business scholarship, tech company laptop grant)',
      'Unique human interest stories (superintendent skydiving bet, student DJ, counselor wins pie contest, janitor earns degree, twins both valedictorian)',
      'School improvements (new facilities, technology upgrades, garden projects, composting, stadium renovation, library makeover)',
      'Sports (team making playoffs, new coach hired, athlete signs with college, record-breaking season, powerlifting state qualifier)',
      'Arts/Music (theater production, band competition, art show, choir wins state, student film screening, mural project)'
    ];

    // Shuffle and pick 6 random topics
    const shuffled = allTopics.sort(() => Math.random() - 0.5);
    const selectedTopics = shuffled.slice(0, 6);
    const topicList = selectedTopics.map((t, i) => `Story ${i + 1}: ${t}`).join('\n');

    // Random seed number to prevent caching
    const seed = Math.floor(Math.random() * 1000000);

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
          content: `[Generation seed: ${seed}] You are writing practice stories for the UIL (University Interscholastic League) Headline Writing contest in Texas. Generate SIX different news stories. Each story will have a different headline assignment, just like a real UIL contest.

CRITICAL FORMAT REQUIREMENTS (based on real UIL tests):
- All stories are for the "Leaguetown Press," the student newspaper of Leaguetown High School
- Each story should be 120-200 words (shorter than a full article — UIL stories are concise)
- Include 1-3 direct quotes from named sources (students, teachers, administrators, community members) with first AND last names plus their title/grade
- The LEAD (first 1-2 sentences) must contain the main news — this is what headlines should capture
- Later sentences add detail, quotes, and context
- Use realistic high school journalism tone — factual, not flowery
- Include specific details: dates, numbers, dollar amounts, locations, names
- Stories should feel like they belong in a real Texas high school newspaper
- Invent FRESH, ORIGINAL character names — do NOT reuse common placeholder names

YOU MUST write about these 6 specific topics (one story per topic):
${topicList}

Make each story unique, specific, creative, and interesting — the kind of stories that would appear in a real UIL contest. Vary the tone, structure, and details. Use different character names each time.

Format the response as JSON with exactly 6 stories:
{
  "stories": [
    "Story 1 full text here...",
    "Story 2 full text here...",
    "Story 3 full text here...",
    "Story 4 full text here...",
    "Story 5 full text here...",
    "Story 6 full text here..."
  ]
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
      const storyData = JSON.parse(jsonMatch[0]);
      // Validate we got 6 stories
      if (storyData.stories && Array.isArray(storyData.stories) && storyData.stories.length === 6) {
        return res.status(200).json(storyData);
      } else {
        return res.status(500).json({ error: 'Expected 6 stories but got ' + (storyData.stories ? storyData.stories.length : 0) });
      }
    } else {
      return res.status(500).json({ error: 'Failed to parse stories' });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
