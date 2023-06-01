import { PromptTemplate } from "langchain";

export async function formatPrompt({ template, variables }) {
  const prompt = new PromptTemplate({
    template: template,
    inputVariables: Object.keys(variables),
  });
  return await prompt.format(variables);
}
