# Call analysis

> Summarize and evaluate calls automatically

## Overview

Call analysis automatically summarizes and evaluates every call for insights and quality control. As soon as a call ends, analysis is triggered in the background and typically completes within a few seconds. The system uses the latest version of Anthropic's Claude Sonnet (with OpenAI GPT-4o as fallback) to:

- Summarize the call
- Extract structured data
- Evaluate call success

Results are attached to the call record and can be viewed in the call instance dashboard or retrieved via the API. You can customize the analysis using prompts and schemas in your assistant's `analysisPlan`.

## Customization

You can customize the following properties in your assistant's `analysisPlan`:

### Summary prompt

- Used to create a concise summary of the call, stored in `call.analysis.summary`.
- **Default prompt:**
  ```text
  You are an expert note-taker. You will be given a transcript of a call. Summarize the call in 2-3 sentences, if applicable.
  ```
- **Customize:**
  ```json
  {
    "summaryPrompt": "Custom summary prompt text"
  }
  ```
- **Disable:**
  ```json
  {
    "summaryPrompt": ""
  }
  ```

### Structured data prompt

- Extracts specific data from the call, stored in `call.analysis.structuredData`.
- **Default prompt:**
  ```text
  You are an expert data extractor. You will be given a transcript of a call. Extract structured data per the JSON Schema.
  ```
- **Customize:**
  ```json
  {
    "structuredDataPrompt": "Custom structured data prompt text"
  }
  ```

### Structured data schema

- Defines the format of extracted data using JSON Schema.
- **Customize:**
  ```json
  {
    "structuredDataSchema": {
      "type": "object",
      "properties": {
        "field1": { "type": "string" },
        "field2": { "type": "number" }
      },
      "required": ["field1", "field2"]
    }
  }
  ```

### Success evaluation prompt

- Used to determine if the call was successful, stored in `call.analysis.successEvaluation`.
- **Default prompt:**
  ```text
  You are an expert call evaluator. You will be given a transcript of a call and the system prompt of the AI participant. Determine if the call was successful based on the objectives inferred from the system prompt.
  ```
- **Customize:**
  ```json
  {
    "successEvaluationPrompt": "Custom success evaluation prompt text"
  }
  ```
- **Disable:**
  ```json
  {
    "successEvaluationPrompt": ""
  }
  ```

### Success evaluation rubric

- Defines the criteria for evaluating call success. Options:
  - `NumericScale`: 1 to 10
  - `DescriptiveScale`: Excellent, Good, Fair, Poor
  - `Checklist`: List of criteria
  - `Matrix`: Grid of criteria and performance
  - `PercentageScale`: 0% to 100%
  - `LikertScale`: Strongly Agree to Strongly Disagree
  - `AutomaticRubric`: Auto breakdown by criteria
  - `PassFail`: true/false
- **Customize:**
  ```json
  {
    "successEvaluationRubric": "NumericScale"
  }
  ```

### Combine prompts and rubrics

- You can combine prompts and rubrics for detailed instructions:
  ```json
  {
    "successEvaluationPrompt": "Evaluate the call based on these criteria:...",
    "successEvaluationRubric": "Checklist"
  }
  ```

## Results

- Once analysis is complete, results are attached to the call record.
- View results in the call instance dashboard or retrieve them via the API.
- Results include:
  - Call summary
  - Structured data
  - Success evaluation and rubric

By customizing these properties, you can tailor call analysis to your needs and gain valuable insights from every call.
