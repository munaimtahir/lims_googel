import { GoogleGenAI } from "@google/genai";
import { LabRequest, Patient } from '../types';

// FIX: Initialize GoogleGenAI with API key from environment variables as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAiInterpretation = async (request: LabRequest, patient: Patient): Promise<string> => {
  const patientInfo = `Patient Information:
- Name: ${patient.name}
- Age: ${patient.age} years
- Gender: ${patient.gender}`;

  const resultsInfo = request.tests.map(test => {
    const testResults = request.results[test.id];
    if (!testResults || testResults.length === 0 || !request.collectedSamples?.includes(test.sampleTypeId)) {
      return null;
    }

    const params = test.parameters.map(param => {
      const result = testResults.find(r => r.parameterId === param.id);
      if (!result || !result.value.trim()) {
        return null;
      }
      return `- ${param.name}: ${result.value} ${param.unit} (Reference: ${param.referenceRange}) ${result.flag && result.flag !== 'N' ? `[FLAG: ${result.flag}]` : ''}`;
    }).filter(Boolean).join('\n');

    if (!params) return null;

    return `\nTest: ${test.name}\n${params}`;
  }).filter(Boolean).join('\n');

  if (!resultsInfo.trim()) {
      return "No results available to interpret.";
  }

  const prompt = `
Provide a concise clinical interpretation for the following laboratory report. 
This interpretation is for a healthcare professional. Highlight significant abnormal findings, suggest potential implications, and recommend correlations or next steps where appropriate. Do not provide a diagnosis.

${patientInfo}

Laboratory Results:
${resultsInfo}

Clinical Interpretation:
`;

  try {
    // FIX: Call Gemini API to generate content based on the constructed prompt.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Use gemini-2.5-flash for basic text tasks.
      contents: prompt,
      config: {
        systemInstruction: "You are an expert medical technologist providing clinical interpretations of lab results for doctors. Your analysis should be concise, professional, and directly relevant to the provided data.",
        temperature: 0.3,
      },
    });
    // FIX: Extract text from the response using the .text property as per guidelines.
    return response.text?.trim() || "AI analysis could not be generated.";
  } catch (error) {
    console.error("Gemini API call failed:", error);
    return "An error occurred while generating the AI interpretation.";
  }
};
