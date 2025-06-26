export const ACTION_POINTS_ANALYSIS_PLAN = {
  summaryPrompt: "You are an expert note-taker. You will be given a transcript of a call. Summarize the call in 2-3 sentences, if applicable.",
  structuredDataPrompt: `You are an AI assistant that analyzes call transcripts to extract key action points for real estate agents.

Your task is to analyze the provided call content and extract structured data about the call. Focus on actionable insights that help the real estate agent follow up effectively.

Extract the following information in the exact JSON format specified by the schema.`,
  structuredDataSchema: {
    type: "object",
    properties: {
      callPurpose: {
        type: "string",
        description: "Brief description of the main purpose or reason for the call"
      },
      sentiment: {
        type: "string",
        enum: ["positive", "neutral", "negative"],
        description: "Overall sentiment of the call based on tone and outcomes"
      },
      keyPoints: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Important topics or discussion points from the call (max 1-2 sentences each)"
      },
      followUpItems: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Specific actions that need to be taken as follow-up (actionable items only)"
      },
      urgentConcerns: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Time-sensitive or critical issues that require immediate attention (only if genuinely urgent)"
      }
    },
    required: ["callPurpose", "sentiment", "keyPoints", "followUpItems", "urgentConcerns"]
  },
  successEvaluationPrompt: "You are an expert call evaluator for real estate agents. Determine if the call was successful based on whether the agent achieved their objectives (lead qualification, appointment setting, information gathering, etc.)",
  successEvaluationRubric: "PassFail"
}; 