import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CoreMessage, streamText, ToolSet, Tool } from "ai";
import { getOpenRouterKey } from '../src/cli';
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { experimental_createMCPClient } from "ai";
import type { TimeRangeType } from '../src/types';

interface ToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

interface TestSetup {
  transport: StdioClientTransport;
  tools: ToolSet;
  chatModel: any;
}

interface PageAnalyticsResponse {
  page: string;
  period: {
    start: string;
    end: string;
  };
  metrics: Record<string, number>;
  referrers: Array<{
    visit: { source: string };
    visitors: number;
  }>;
  countries: Array<{
    visit: { country: string };
    visitors: number;
  }>;
}

interface ToolCallResult {
  result: ToolResult;
}

interface ToolCall {
  toolName: string;
  args: Record<string, any>;
}

interface Step {
  toolCalls?: ToolCall[];
  toolResults?: ToolCallResult[];
}

describe('Page Analytics', () => {
  let setup: TestSetup;

  // Shared setup function
  beforeEach(async () => {
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

    setup = { transport, tools, chatModel };
  });

  afterEach(() => {
    setup.transport.close();
  });

  // Helper function to run analytics query
  async function runAnalyticsQuery(query: string): Promise<Step[]> {
    const messages: CoreMessage[] = [{ role: "user", content: query }];
    const response = await streamText({
      model: setup.chatModel,
      messages,
      tools: setup.tools,
      maxSteps: 10,
    });

    // Process the stream
    for await (const textPart of response.textStream) {
      // Consume stream
    }

    // Wait for all steps to complete
    const steps = await response.steps;
    await Promise.all(steps.map(step => step.toolResults));

    return steps;
  }

  describe('analyze_page', () => {
    it('should analyze a specific page with basic metrics', async () => {
      const steps = await runAnalyticsQuery(
        "Show me analytics for the /blog page on willschenk.com for last week"
      );

      const analyzeCall = steps.find(step => 
        step.toolCalls?.some(call => call.toolName === 'analyze_page')
      );

      expect(analyzeCall).toBeDefined();
      expect(analyzeCall?.toolCalls?.[0].args).toMatchObject({
        site_id: "willschenk.com",
        page: "/blog",
        timeRange: "last_7_days",
        include: expect.arrayContaining(['visitors', 'pageviews', 'avg_time'])
      });

      // Check tool results
      const toolResults = analyzeCall?.toolResults?.[0]?.result as ToolResult;
      expect(toolResults).toBeDefined();
      if (toolResults) {
        const data = JSON.parse(typeof toolResults === 'string' ? toolResults : JSON.stringify(toolResults)) as PageAnalyticsResponse;
        expect(data).toBeDefined();
        expect(data.page).toBe('/blog');
        expect(data.period).toMatchObject({
          start: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          end: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
        });
        expect(data.metrics).toMatchObject({
          visitors: expect.any(Number),
          pageviews: expect.any(Number),
          visit_duration: expect.any(Number)
        });
      }
    });

    it('should analyze a page with custom date range and all metrics', async () => {
      const steps = await runAnalyticsQuery(
        "Show me complete analytics for the /about page on thefocus.ai from January 1st to March 31st 2024"
      );

      const analyzeCall = steps.find(step => 
        step.toolCalls?.some(call => call.toolName === 'analyze_page')
      );

      expect(analyzeCall).toBeDefined();
      expect(analyzeCall?.toolCalls?.[0].args).toMatchObject({
        site_id: "thefocus.ai",
        page: "/about",
        timeRange: {
          from: "2024-01-01",
          to: "2024-03-31"
        },
        include: expect.arrayContaining([
          'visitors',
          'pageviews',
          'bounce_rate',
          'avg_time',
          'exit_rate'
        ])
      });

      // Check tool results
      const toolResults = analyzeCall?.toolResults?.[0]?.result as ToolResult;
      expect(toolResults).toBeDefined();
      if (toolResults) {
        const data = JSON.parse(typeof toolResults === 'string' ? toolResults : JSON.stringify(toolResults)) as PageAnalyticsResponse;
        expect(data).toBeDefined();
        expect(data.page).toBe('/about');
        expect(data.period).toMatchObject({
          start: "2024-01-01",
          end: "2024-03-31"
        });
        expect(data.metrics).toMatchObject({
          visitors: expect.any(Number),
          pageviews: expect.any(Number),
          bounce_rate: expect.any(Number),
          visit_duration: expect.any(Number),
          exit_rate: expect.any(Number)
        });
        expect(data.referrers).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              visit: { source: expect.any(String) },
              visitors: expect.any(Number)
            })
          ])
        );
        expect(data.countries).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              visit: { country: expect.any(String) },
              visitors: expect.any(Number)
            })
          ])
        );
      }
    });

    it('should analyze a page with rolling window time range', async () => {
      const steps = await runAnalyticsQuery(
        "Show me analytics for the /docs page on thefocus.ai for the last 2 weeks"
      );

      const analyzeCall = steps.find(step => 
        step.toolCalls?.some(call => call.toolName === 'analyze_page')
      );

      expect(analyzeCall).toBeDefined();
      expect(analyzeCall?.toolCalls?.[0].args).toMatchObject({
        site_id: "thefocus.ai",
        page: "/docs",
        timeRange: {
          last: 14,
          unit: "days"
        }
      });

      // Check tool results
      const toolResults = analyzeCall?.toolResults?.[0]?.result as ToolResult;
      expect(toolResults).toBeDefined();
      if (toolResults) {
        const data = JSON.parse(typeof toolResults === 'string' ? toolResults : JSON.stringify(toolResults)) as PageAnalyticsResponse;
        expect(data).toBeDefined();
        expect(data.page).toBe('/docs');
        expect(data.period).toMatchObject({
          start: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          end: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
        });
      }
    });

    it('should handle invalid pages gracefully', async () => {
      const steps = await runAnalyticsQuery(
        "Show me analytics for the /nonexistent page on invalid-site.com for last week"
      );

      const analyzeCall = steps.find(step => 
        step.toolCalls?.some(call => call.toolName === 'analyze_page')
      );

      expect(analyzeCall).toBeDefined();
      expect(analyzeCall?.toolCalls?.[0].args).toMatchObject({
        site_id: "invalid-site.com",
        page: "/nonexistent",
        timeRange: "last_7_days"
      });

      // Check tool results
      const toolResults = analyzeCall?.toolResults?.[0]?.result as ToolResult;
      expect(toolResults).toBeDefined();
      if (toolResults) {
        expect(toolResults.content[0].text).toContain('error');
        expect(toolResults.isError).toBe(true);
      }
    });

    it('should handle relative time ranges', async () => {
      const steps = await runAnalyticsQuery(
        "Show me analytics for the /blog page on willschenk.com for this month"
      );

      const analyzeCall = steps.find(step => 
        step.toolCalls?.some(call => call.toolName === 'analyze_page')
      );

      expect(analyzeCall).toBeDefined();
      expect(analyzeCall?.toolCalls?.[0].args).toMatchObject({
        site_id: "willschenk.com",
        page: "/blog",
        timeRange: "this_month"
      });

      // Check tool results
      const toolResults = analyzeCall?.toolResults?.[0]?.result as ToolResult;
      expect(toolResults).toBeDefined();
      if (toolResults) {
        const data = JSON.parse(typeof toolResults === 'string' ? toolResults : JSON.stringify(toolResults)) as PageAnalyticsResponse;
        expect(data).toBeDefined();
        expect(data.period.start).toMatch(/^\d{4}-\d{2}-01$/); // Should start on first day of month
        expect(data.period.end).toMatch(/^\d{4}-\d{2}-\d{2}$/); // Should end on current day
      }
    });
  });
}); 