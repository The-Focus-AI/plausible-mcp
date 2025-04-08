import { createInterface } from "readline";
import { CoreMessage, streamText, experimental_createMCPClient } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { execSync } from "child_process";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { processQuery } from "./generate";

// System prompt to define the assistant's behavior
const systemPrompt = `
You are a helpful assistant that can answer questions and help with tasks.
`;

export async function getOpenRouterKey() {
  let apiKey: string | null = null;
  // Try from environment first
  if (process.env.OPENROUTER_API_KEY) {
    apiKey = process.env.OPENROUTER_API_KEY;
    return apiKey;
  }

  try {
    console.error(
      "OPENROUTER_API_KEY not found in environment, trying 1Password..."
    );
    const result = execSync(
      'op read "op://Development/OpenRouter Key/notesPlain"',
      { encoding: "utf8" }
    );
    apiKey = result.trim();
    return apiKey;
  } catch (error) {
    console.error("Failed to get OpenRouter key:", error);
    process.exit(1);
  }
}

// Main CLI loop
async function startCLI() {
  const messages: CoreMessage[] = [];
  // Add system prompt to message history
  messages.push({ role: "system", content: systemPrompt });

  try {
    const apiKey = await getOpenRouterKey();

    console.log("Welcome to the Plausible Analytics Chat Interface!");
    console.log('Type "help" to see available commands or "exit" to quit.\n');

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Start the chat loop
    const promptUser = () => {
      rl.question("\nYou: ", async (query) => {
        if (query.toLowerCase() === "exit") {
          console.log("Goodbye!");
          rl.close();
          return;
        }

        await processQuery(query, messages, apiKey);
        promptUser();
      });
    };

    promptUser();
  } catch (error) {
    console.error("Failed to initialize CLI:", error);
    process.exit(1);
  }
}

// Start the CLI
startCLI().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
