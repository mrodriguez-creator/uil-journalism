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

    // Feature writing uses 1 HOUR, and the publication date pattern matches news
    const now = new Date();
    const daysAhead = Math.floor(Math.random() * 5) + 2;
    const pubDate = new Date(now.getTime() + daysAhead * 86400000);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
    const pubDateStr = days[pubDate.getDay()] + ', ' + months[pubDate.getMonth()] + ' ' + pubDate.getDate();

    // Key event date is 1-3 days after publication
    const eventDaysAfter = Math.floor(Math.random() * 3) + 1;
    const eventDate = new Date(pubDate.getTime() + eventDaysAfter * 86400000);
    const eventDateStr = days[eventDate.getDay()] + ', ' + months[eventDate.getMonth()] + ' ' + eventDate.getDate();

    // Feature writing topics — human interest stories about people at school
    // Based on real UIL tests: teacher with secret hobby, student saves kids from fire,
    // teacher living in car, etc. These are HUMAN stories, not hard news.
    const allTopics = [
      'a teacher who has a surprising secret hobby discovered by students',
      'a student who performed a heroic act that saved someone',
      'a longtime janitor retiring after decades of service who is beloved by the school',
      'a student who started a charity or nonprofit that has made a big community impact',
      'a teacher who overcame a personal hardship with help from students or community',
      'a student athlete who returned to competition after a serious injury or illness',
      'a student who discovered a hidden talent and achieved something remarkable',
      'a teacher-student mentorship that changed both of their lives',
      'a school club or group that did something unexpected and meaningful for the community',
      'a student who balances an unusual job or responsibility with school life',
      'a cafeteria worker or staff member with a fascinating life story outside of school',
      'a student who reconnected with a long-lost family member through a school project',
      'a teacher who uses unconventional methods that transformed student performance',
      'a student who created an invention or app that solved a real problem at school',
      'a group of students who rallied together to help a classmate through a crisis',
      'a coach who made a life-changing decision that affected the entire team',
      'a student who overcame homelessness or housing instability to succeed academically',
      'a school tradition that started because of one student and has lasted for years',
      'a substitute teacher who became a permanent fixture and beloved figure at school',
      'a student musician or artist whose work gained unexpected recognition outside school'
    ];
    const shuffled = allTopics.sort(() => Math.random() - 0.5);
    const topic = shuffled[0];

    // Randomize school size
    const schoolSizes = [700, 950, 1210, 1430, 1800, 2070, 2350, 3100, 4480];
    const schoolSize = schoolSizes[Math.floor(Math.random() * schoolSizes.length)];

    // Number of source quotes (4-5 like real UIL feature tests)
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
          content: `[Seed: ${seed}] Create a UIL Feature Writing contest prompt matching the EXACT format of the real Texas UIL Feature Writing contest.

=== WHAT IS UIL FEATURE WRITING? ===

Feature writing is DIFFERENT from news writing. A feature story is a HUMAN INTEREST story — it focuses on people, emotions, and storytelling. The prompts give students raw facts and quotes about an interesting person or situation at Leaguetown High School, and students write a compelling feature story.

The key difference: a feature story lead does NOT need to be a summary lead with the 5Ws. Instead, feature leads should GRAB THE READER with a scene, a moment, or a vivid image. The story uses a nut graph (summary paragraph) AFTER the lead to tell the reader what the story is about.

=== FORMAT REQUIREMENTS ===

The prompt is a FACT SHEET that gives students raw information about a human interest story at Leaguetown High School. Students must read the fact sheet and write a feature story for the school newspaper (the Leaguetown Press).

The fact sheet MUST follow this EXACT structure (matching real UIL tests):

1. OPENING — School context and narrative setup:
"Leaguetown High School has ${schoolSize} students in grades 9-12."
Then 3-5 paragraphs of NARRATIVE FACTS telling the story of what happened. This should read like background research — who was involved, what happened, how it unfolded, specific details and numbers.

The story topic: ${topic}

2. TIMELINE — A key upcoming event (ceremony, meeting, celebration, milestone) is happening on or around ${eventDateStr}. Include the sentence:
"You are writing for the issue of the Press to be distributed ${pubDateStr}."

3. NAMED SOURCE QUOTES — ${numQuotes} sources, each formatted EXACTLY like real UIL tests:
■  FIRSTNAME LASTNAME, title/role
"Full quote text that is 80-200 words. Feature quotes should be PERSONAL, EMOTIONAL, and REVEALING. They should show character, share feelings, tell stories, and give the reader a sense of the person. May span multiple paragraphs within the quote."

The sources should include a MIX of:
- The main subject of the story (always include — their quote should be longest and most personal)
- 1-2 people who know the subject well (friend, family member, colleague)
- 1-2 people who can speak to the impact or significance (administrator, community member, fellow student)

4. Optionally: ■  ADDITIONAL INFORMATION — 1-2 sentences of broader context

=== REAL UIL FEATURE EXAMPLE STRUCTURE (State 2025) ===

"Leaguetown High School has 2,070 students in grades 9-12. Juniors Jason Flaherty and Mark Kozoman were watching YouTube videos in the cafeteria one day when they came across a video that appeared to feature their physics teacher John Ashton on the thumbnail. He was wearing a metal helmet and armor...
[Several paragraphs telling the complete narrative]
You are writing for the issue of the Press to be distributed May 19.

■  JOHN ASHTON, physics teacher
"I'm not ashamed of it, but I never intended to tell my students about my involvement in the SMC..."
[Long, personal, emotional quote]

■  JASON FLAHERTY, junior
"I'm not going to lie. We did laugh for a little bit..."

■  MARK KOZOMAN, junior
"Mr. Ashton's fighting looks so legit..."

■  MISTY ST. CLAIR, senior
"I struggled to get a B in physics last year, but Mr. Ashton helped me every step of the way..."

=== ANOTHER REAL UIL FEATURE (Invitational A 2025) ===

"Leaguetown High School has 886 students in grades 9-12. Last week, sophomore Helen Santos was babysitting her neighbor's two young children...
[Narrative about student saving kids from a fire and rescuing a Medal of Honor]
Thanks to Helen's quick thinking and actions, Leaguetown Mayor will present her with the Hometown Hero Award at a ceremony before the city council meeting...

■  HELEN SANTOS, sophomore
"I babysit for neighbors across the street about once a week. Bryson and Kaylee are such sweet kids..."
[Long personal quote with emotional details]

■  SARAH VINICK, Helen's neighbor
"Ever since the fire, I've been grateful every day..."

■  BOB RUSSELL, firefighter
"We love to arrive on a scene and see that everyone has already gotten out safely..."

■   WILL BAILEY, sophomore
"I'm not surprised at all that Helen saved some kids from a fire..."

■   ERIN SANTOS, Helen's mother
"Even before the fire, we've felt very lucky to have Helen in our family..."

=== IMPORTANT RULES ===
- This is a FEATURE prompt — the story should be about a PERSON and their experience
- The fact sheet tells a compelling human story with specific narrative details
- Include emotional moments, specific details, and vivid scenes students can use in their leads
- Each quote should be substantial (80-200 words) and deeply personal/emotional
- The main subject's quote should be the longest and most revealing
- Include at least one quote that has multiple paragraphs (use \\n in the quote)
- Names should be realistic and diverse
- Include specific numbers, dates, and details that add authenticity
- The story should have a clear THEME or FOCUS (e.g., "teacher is a knight in and out of the classroom")
- Include at least one detail that could make a great creative lead (a vivid scene, a surprising moment, an ironic detail)
- Do NOT include any sample story, tips, or writing instructions — just the fact sheet

Return as JSON:
{
  "topic": "Brief 3-5 word topic description",
  "publicationDate": "${pubDateStr}",
  "eventDate": "${eventDateStr}",
  "schoolSize": ${schoolSize},
  "factSheet": "The complete fact sheet text. Use \\n\\n for paragraph breaks. Use ■ before each source name. Format quotes with the source header on its own line.",
  "storyFocus": "One sentence describing the theme/focus of this feature story",
  "leadHint": "One sentence describing a vivid detail or moment that could make a great creative lead",
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
