

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { Message, streamText, experimental_createMCPClient, StreamTextResult, StepResult } from "ai";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export async function processQuery(query: string, messages: Message[], apiKey: string, steps: StepResult<any>[]): Promise<StreamTextResult<any, any>> {
    try {
      // Add user message to history
      messages.push({ id: "1", role: "user", content: query });
  
      const openrouter = createOpenRouter({ apiKey });
      const chatModel = openrouter("google/gemini-2.0-flash-lite-001");
  
      const transport = new StdioClientTransport({
        command: "pnpm",
        args: ["run", "server"],
      });
  
      const plausible = await experimental_createMCPClient({
        transport,
      });
  
      const tools = await plausible.tools();
  
      // Stream the response using Vercel AI SDK
      const response = await streamText({
        model: chatModel,
        messages,
        tools,
        maxSteps: 10,
        onError: (error) => {
          console.error(error);
        },
      });
  
      // Process the stream
      process.stdout.write("\nAssistant: ");
      let fullResponse = "";
      for await (const textPart of response.textStream) {
        process.stdout.write(textPart);
        fullResponse += textPart;
      }
  
      process.stdout.write("\n");
  
      transport.close();

      // Add assistant's response to history
      messages.push({ id: "2", role: "assistant", content: fullResponse });

      // Add for testing
      steps.push(...await response.steps);

      return response;
    } catch (error) {
      console.error(
        "\nError:",
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    }
  }
