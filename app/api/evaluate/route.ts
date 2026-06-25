import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: Request) {
  try {
    const { questions, answers, jd } = await req.json();

    if (!questions || !answers || !Array.isArray(questions)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is missing');

    const groq = new Groq({ apiKey });

    // Build the Q&A transcript
    const qaText = questions
      .map((q: any, i: number) => {
        return `Q${i + 1}: ${q.question}\nCandidate's Answer: ${answers[i] || 'No answer'}\nIdeal Answer: ${q.idealAnswer}`;
      })
      .join('\n\n');

    const prompt = `
You are an expert interview evaluator. Based on the following job description and the candidate's answers, provide a detailed evaluation in JSON format.

Job Description:
${jd}

Interview Q&A:
${qaText}

Evaluate and output ONLY this JSON (no other text):
{
  "overallScore": number (0-100),
  "technicalAccuracy": number (0-100),
  "communicationClarity": number (0-100),
  "relevantExamples": number (0-100),
  "strengths": [string, string, string],
  "areasToImprove": [string, string, string],
  "overallFeedback": "2-3 sentences summarizing performance",
  "tips": [string, string, string]
}
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = chatCompletion.choices[0]?.message?.content || '';
    const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const evaluation = JSON.parse(cleaned);

    return NextResponse.json({ evaluation });
  } catch (error: any) {
    console.error('Evaluation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to evaluate' },
      { status: 500 }
    );
  }
}