import { describe, it, expect } from 'vitest'
import { CoreMessage, streamText } from "ai";
import { processQuery } from '../src/generate';
import { getOpenRouterKey } from '../src/cli';
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { experimental_createMCPClient } from "ai";

describe('Natural Language Query Tests', () => {
  describe('Traffic Analysis', () => {
    // Test case: "What was the traffic on willschenk.com last week"
    it('should fetch last week\'s traffic for willschenk.com', async () => {
      const messages: CoreMessage[] = [];
      const query = "How many visitors did willschenk.com get last week? Show me daily numbers.";
      const apiKey = await getOpenRouterKey();

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

      messages.push({ role: "user", content: query });
      const response = await streamText({
        model: chatModel,
        messages,
        tools,
        maxSteps: 10,
      });

      // Process the stream and wait for all steps to complete
      let fullResponse = "";
      for await (const textPart of response.textStream) {
        fullResponse += textPart;
      }

      // Wait for all steps to complete
      const steps = await response.steps;
      await Promise.all(steps.map(step => step.toolResults));

      const breakdownCall = steps.find(step => 
        step.toolCalls?.some(call => call.toolName === 'get_breakdown')
      );

      expect(breakdownCall).toBeDefined();
      expect(breakdownCall?.toolCalls?.[0].args).toMatchObject({
        site_id: "willschenk.com",
        metrics: ["visitors"],
        dimensions: ["date"],
        date_range: "7d"
      });

      // Check tool results
      const toolResults = breakdownCall?.toolResults?.[0]?.result;
      expect(toolResults).toBeDefined();
      if (toolResults) {
        const data = JSON.parse(typeof toolResults === 'string' ? toolResults : JSON.stringify(toolResults));
        expect(data).toBeDefined();
        expect(data.content).toBeDefined();
        expect(data.content[0]).toBeDefined();
        expect(data.content[0].text).toBeDefined();
      }

      transport.close();
    }, 30000)

    // Test case: "what counties visited thefocus.ai over the last month"
    it('should fetch visitor countries for thefocus.ai over the last month', async () => {
      const messages: CoreMessage[] = [];
      const query = "what counties visited thefocus.ai over the last month";
      const apiKey = await getOpenRouterKey();

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

      messages.push({ role: "user", content: query });
      const response = await streamText({
        model: chatModel,
        messages,
        tools,
        maxSteps: 10,
      });

      // Process the stream and wait for all steps to complete
      let fullResponse = "";
      for await (const textPart of response.textStream) {
        fullResponse += textPart;
      }

      // Wait for all steps to complete
      const steps = await response.steps;
      await Promise.all(steps.map(step => step.toolResults));

      const breakdownCall = steps.find(step => 
        step.toolCalls?.some(call => call.toolName === 'get_breakdown')
      );

      expect(breakdownCall).toBeDefined();
      expect(breakdownCall?.toolCalls?.[0].args).toMatchObject({
        site_id: "thefocus.ai",
        metrics: ["visitors"],
        dimensions: ["visit:country"],
        date_range: expect.stringMatching(/30d|month/)
      });

      // Verify we got country data in the results
      const toolResults = breakdownCall?.toolResults?.[0]?.result;
      expect(toolResults).toBeDefined();
      if (toolResults) {
        const data = JSON.parse(typeof toolResults === 'string' ? toolResults : JSON.stringify(toolResults));
        expect(data).toBeDefined();
        expect(data.content).toBeDefined();
        expect(data.content[0]).toBeDefined();
        expect(data.content[0].text).toBeDefined();
        
        // Parse the JSON string from the text field
        const responseData = JSON.parse(data.content[0].text);
        expect(responseData.results).toBeDefined();
        expect(Array.isArray(responseData.results)).toBe(true);
        expect(responseData.results.length).toBeGreaterThan(0);
        expect(responseData.results[0].dimensions[0]).toMatch(/^[A-Z]{2}$/); // Country code format
      }

      transport.close();
    }, 30000)

    // Test error handling for invalid site
    it('should handle invalid site domain errors', async () => {
      const messages: CoreMessage[] = [];
      const query = "what was the traffic on invalid-site.com last week";
      const apiKey = await getOpenRouterKey();

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

      messages.push({ role: "user", content: query });
      const response = await streamText({
        model: chatModel,
        messages,
        tools,
        maxSteps: 10,
      });

      // Process the stream and wait for all steps to complete
      let fullResponse = "";
      for await (const textPart of response.textStream) {
        fullResponse += textPart;
      }

      // Wait for all steps to complete
      const steps = await response.steps;
      await Promise.all(steps.map(step => step.toolResults));

      const breakdownCall = steps.find(step => 
        step.toolCalls?.some(call => call.toolName === 'get_breakdown')
      );

      expect(breakdownCall).toBeDefined();
      expect(breakdownCall?.toolCalls?.[0].args).toMatchObject({
        site_id: "invalid-site.com",
        metrics: ["visitors"],
        dimensions: ["date"],
        date_range: "7d"
      });

      // But should get an error result
      const toolResults = breakdownCall?.toolResults?.[0]?.result;
      expect(toolResults).toBeDefined();
      if (toolResults) {
        expect(toolResults.content).toBeDefined();
        expect(toolResults.content[0]).toBeDefined();
        expect(toolResults.content[0].text).toContain('error');
      }

      transport.close();
    }, 30000)
  })
}) 