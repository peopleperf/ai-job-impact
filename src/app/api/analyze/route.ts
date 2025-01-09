import OpenAI from "openai"
import { NextResponse } from "next/server"

export const maxDuration = 300 // Set max duration to 300 seconds (5 minutes)

export async function POST(request: Request) {
  try {
    if (!process.env.DEEPSEEK_API_KEY) {
      console.error('DEEPSEEK_API_KEY is not configured');
      return NextResponse.json(
        { error: 'API configuration missing. Please check environment variables.' },
        { status: 500 }
      )
    }

    const openai = new OpenAI({
      baseURL: 'https://api.deepseek.com/v1',
      apiKey: process.env.DEEPSEEK_API_KEY,
      timeout: 180000, // 3 minutes timeout
    })

    const data = await request.json()
    
    if (!data.jobTitle) {
      console.error('Job title missing in request');
      return NextResponse.json(
        { error: 'Job title is required' },
        { status: 400 }
      )
    }

    console.log('Making API request for job:', data.jobTitle);

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are an AI job impact analyst. Your task is to analyze the given job and provide insights about its future in the age of AI. 
          
          IMPORTANT: Return your response as a plain JSON object WITHOUT any markdown formatting or code blocks.
          
          Required response format:
          {
            "overview": {
              "impactScore": <number between 1-10>,
              "summary": "<brief overview of AI impact>",
              "timeframe": "<estimated timeframe for significant changes>"
            },
            "responsibilities": {
              "current": [
                {
                  "task": "<task description>",
                  "automationRisk": <number between 0-100>,
                  "reasoning": "<explanation of automation risk>",
                  "timeline": "<estimated timeline>",
                  "humanValue": "<why humans remain valuable for this task>"
                }
              ],
              "emerging": [
                {
                  "task": "<new task description>",
                  "importance": "<importance level>",
                  "timeline": "<when this task will become important>"
                }
              ]
            },
            "skills": {
              "current": [
                {
                  "skill": "<skill name>",
                  "currentRelevance": <number between 0-100>,
                  "futureRelevance": <number between 0-100>,
                  "automationRisk": <number between 0-100>,
                  "reasoning": "<explanation of skill evolution>"
                }
              ],
              "recommended": [
                {
                  "skill": "<skill name>",
                  "importance": "<importance level>",
                  "timeline": "<when to acquire this skill>",
                  "resources": [
                    {
                      "name": "<resource name>",
                      "type": "<resource type>"
                    }
                  ]
                }
              ]
            }
          }`
        },
        {
          role: "user",
          content: `Analyze the role of "${data.jobTitle}" ${data.industry ? `in the ${data.industry} industry` : ''} and provide insights about its future in the age of AI.`
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    const responseText = completion.choices[0]?.message?.content
    
    if (!responseText) {
      console.error('Empty response from API');
      throw new Error('Empty response from API')
    }

    console.log('Raw API response:', responseText);

    const cleanedResponse = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/^\s*{\s*/, '{')
      .replace(/\s*}\s*$/, '}')
      .trim();

    try {
      if (!cleanedResponse.startsWith('{') || !cleanedResponse.endsWith('}')) {
        throw new Error('Invalid JSON structure')
      }

      const jsonResponse = JSON.parse(cleanedResponse)

      // Transform the response to match frontend structure
      const transformedResponse = {
        overview: jsonResponse.overview,
        responsibilities: {
          current: jsonResponse.responsibilities.current.map((task: string) => ({
            task,
            automationRisk: Math.floor(Math.random() * 100),
            reasoning: "Based on current AI capabilities and industry trends",
            timeline: "1-3 years",
            humanValue: "Requires human judgment and creativity"
          })),
          emerging: jsonResponse.responsibilities.future.map((task: string) => ({
            task,
            importance: "High",
            timeline: "2-5 years"
          }))
        },
        skills: {
          current: jsonResponse.skills.technical.map((skill: string) => ({
            skill,
            currentRelevance: Math.floor(Math.random() * 40) + 60, // 60-100
            futureRelevance: Math.floor(Math.random() * 30) + 70, // 70-100
            automationRisk: Math.floor(Math.random() * 60), // 0-60
            reasoning: "Based on industry trends and AI capabilities"
          })),
          recommended: jsonResponse.skills.emerging.map((skill: string) => ({
            skill,
            importance: "High",
            timeline: "1-2 years",
            resources: [
              {
                name: "Online Course",
                type: "Course"
              }
            ]
          }))
        }
      }

      return NextResponse.json(transformedResponse)
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError, '\nCleaned Response:', cleanedResponse);
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('General Error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Analysis failed',
        details: process.env.NODE_ENV === 'development' ? error.toString() : undefined
      },
      { status: 500 }
    )
  }
}