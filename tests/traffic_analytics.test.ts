import { describe, it, expect, beforeEach } from 'vitest';
import { CoreMessage, Message, StepResult, ToolInvocation } from 'ai';
import { execSync } from 'child_process';
import { processQuery } from '../src/generate';

class TestUtils {
  private static apiKey: string | null = null;

  static async getOpenRouterKey(): Promise<string> {
    if (this.apiKey) return this.apiKey;

    // Try from environment first
    if (process.env.OPENROUTER_API_KEY) {
      this.apiKey = process.env.OPENROUTER_API_KEY;
      return this.apiKey;
    }

    try {
      console.error(
        "OPENROUTER_API_KEY not found in environment, trying 1Password..."
      );
      const result = execSync(
        'op read "op://Development/OpenRouter Key/notesPlain"',
        { encoding: "utf8" }
      );
      this.apiKey = result.trim();
      return this.apiKey;
    } catch (error) {
      console.error("Failed to get OpenRouter key:", error);
      throw error;
    }
  }
}

/**
 * Traffic Analytics Tests
 * 
 * IMPORTANT: All tests MUST use processQuery() to interact with the AI model.
 * Direct manipulation of messages or tool calls is not allowed as it bypasses:
 * 1. The AI's natural language understanding
 * 2. The model's parameter validation and defaults
 * 3. The complete request-response cycle
 * 4. Error handling and edge cases
 */
describe('Traffic Analytics', () => {
  let messages: Message[] = [];
  let apiKey: string;

  beforeEach(async () => {
    messages = []; // Reset message history before each test
    try {
      apiKey = await TestUtils.getOpenRouterKey();
    } catch (error) {
      console.error('Failed to get API key:', error);
      throw error;
    }
    // Add system message to guide the AI
    messages.push({
      id: "1",
      role: "system",
      content: `You are a helpful analytics assistant. When users ask about website traffic or analytics, use the mcp_plausible_mcp_get_breakdown tool with appropriate structured parameters to fetch and analyze the data.

The tool accepts the following parameters:
- site_id: The domain to analyze (e.g., 'example.com')
- date_range: Time period to analyze (e.g., '7d', '30d', 'month')
- metrics: List of metrics to calculate (e.g., ['visitors', 'pageviews'])
- dimensions: Properties to group results by (e.g., ['visit:source'], ['time:day'] for daily data)
- filters: Optional filter conditions (e.g., [['is', 'visit:country', ['US']]])

Important: For date-based queries, always use 'time:day' as the dimension, not 'date'.

Please respond to traffic queries by calling the mcp_plausible_mcp_get_breakdown tool with appropriate parameters based on the user's request.`
    });
  });


  function hasError(steps: StepResult<any>[]){
    for (const step of steps) {
      if (step.text.includes("I encountered an error")) {
        console.log("error response is", JSON.stringify(step, null, 2))
        return true;
      }
    }
    return false;
  }

  // Helper function to find the last get_traffic tool call
  function findLastTrafficToolCall(steps: StepResult<any>[]){
    for (const step of steps.reverse()) {       
      for( const tool of step.toolResults) {
        if (tool.toolName === "get_breakdown" || tool.toolName === "get_traffic") {
          return tool;
        }
      }
    }
    return null;
  }

  it('should handle traffic source analysis', async () => {
    const query = 'Show me traffic sources for willschenk.com';
    const steps: StepResult<any>[] = [];
    await processQuery(query, messages, apiKey, steps);
    
    expect(hasError(steps)).toBe(false);
    expect(messages.length).toBe(3); // System + user + assistant
    expect(messages[1].content).toBe(query);
    
    const toolCall = findLastTrafficToolCall(steps);
    expect(toolCall).toBeDefined();
    expect(toolCall?.args).toMatchObject({
      site_id: 'willschenk.com',
      dimensions: ['visit:source']
    });
  }, 30000);

  it('should handle daily traffic trends', async () => {
    const query = 'Show me daily traffic trends for willschenk.com over the last 30 days';
    const steps: StepResult<any>[] = [];
    await processQuery(query, messages, apiKey, steps);
    
    expect(hasError(steps)).toBe(false);
    expect(messages.length).toBe(3); // System + user + assistant
    expect(messages[1].content).toBe(query);
    
    const toolCall = findLastTrafficToolCall(steps);
    
    expect(toolCall).toBeDefined();
    expect(toolCall?.args).toMatchObject({
      site_id: 'willschenk.com',
      date_range: '30d',
      dimensions: ['time:day']
    });
  }, 30000);

  it('should handle filtered traffic analysis', async () => {
    const query = 'Show me US traffic stats for willschenk.com';
    const steps: StepResult<any>[] = [];
    await processQuery(query, messages, apiKey, steps);
    
    expect(hasError(steps)).toBe(false);
    expect(messages.length).toBe(3); // System + user + assistant
    expect(messages[1].content).toBe(query);
    
    const toolCall = findLastTrafficToolCall(steps);
    expect(toolCall).toBeDefined();
    expect(toolCall?.args).toMatchObject({
      site_id: 'willschenk.com',
      dimensions: ['visit:country'],
      filters: [['is', 'visit:country', ['US']]]
    });
  }, 30000);

  it('should handle default traffic query', async () => {
    const query = 'what is the traffic on willschenk.com';
    const steps: StepResult<any>[] = [];
    await processQuery(query, messages, apiKey, steps);
    
    expect(messages.length).toBe(3); // System + user + assistant
    expect(messages[1].content).toBe(query);
    
    const toolCall = findLastTrafficToolCall(steps);

    expect(toolCall).toBeDefined();
    expect(toolCall?.args).toMatchObject({
      site_id: 'willschenk.com'
    });
    // Should use defaults
    expect(toolCall?.args?.date_range || toolCall?.args?.time_range).toBe('7d');
    expect(toolCall?.args?.metrics).toEqual(['visitors', 'pageviews']);
    expect(toolCall?.args?.dimensions).toEqual(['visit:source']);
  }, 30000);
}); 