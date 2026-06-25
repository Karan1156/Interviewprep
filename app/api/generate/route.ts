import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: Request) {
  try {
    const { jd } = await req.json();

    if (!jd || typeof jd !== 'string') {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is missing');

    const groq = new Groq({ apiKey });

    const prompt = `
You are an expert technical interviewer. Given the following job description, generate exactly 10 interview questions that are likely to be asked in an interview for this role. For each question, provide a concise but complete ideal answer (3-5 sentences). Output ONLY a valid JSON array of objects with keys "question" and "idealAnswer". Do not include any other text, markdown, or code fences.

Example format:
[
  {"question": "What is X?", "idealAnswer": "X is a..."},
  {"question": "Explain Y?", "idealAnswer": "Y means..."}
]

Job Description:
${jd}
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = chatCompletion.choices[0]?.message?.content || '';
    const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const questions = JSON.parse(cleaned);

    if (!Array.isArray(questions) || questions.length !== 10) {
      throw new Error('Generated output is not a valid 10-item array');
    }

    return NextResponse.json({ questions });
  } catch (error: any) {
    console.error('Groq error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate' },
      { status: 500 }
    );
  }
}