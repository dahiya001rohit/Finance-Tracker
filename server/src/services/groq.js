const config = require("../config");

const SYSTEM_PROMPT = `You are an expert personal finance analyst. Given a user's financial data for a specific month, produce a concise, practical analysis in 3–5 bullet points. Focus on:
• Spending patterns and top expense categories
• Income vs. expense balance and savings rate
• Concrete, actionable suggestions to improve financial health
• Any notable anomalies or areas of concern

Keep the tone friendly and non-judgmental. Do not invent numbers not present in the data. Format your response as plain text bullet points starting with •`;

/**
 * Generate an AI financial insight using the Groq API.
 * @param {object} context - { month, totals, categoryBreakdown }
 * @param {string} [apiKey] - override key (reads process.env directly if not passed)
 * @returns {{ summary: string, configured: boolean }}
 */
async function generateFinanceInsight(context, apiKey) {
  const key = apiKey || process.env.GROQ_API_KEY || config.groq.apiKey;
  if (!key) {
    return {
      summary: "Groq is not configured. Add GROQ_API_KEY to your .env file to enable AI insights.",
      configured: false
    };
  }

  const userMessage = `
Monthly Financial Summary for ${context.month}:

TOTALS:
${context.totals.map((t) => `  ${t.kind}: ${t.currency} ${t.amount}`).join("\n")}

CATEGORY BREAKDOWN:
${context.categoryBreakdown.map((c) => `  ${c.kind} | ${c.name}: ${c.currency} ${c.amount}`).join("\n")}

Please provide a concise financial analysis and actionable recommendations.
`.trim();

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.groq.model || "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userMessage }
      ],
      temperature: 0.35,
      max_tokens:  600
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  const summary = data.choices?.[0]?.message?.content?.trim() || "No insight generated.";

  return { summary, configured: true };
}

module.exports = { generateFinanceInsight };
