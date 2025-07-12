/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// Hardcoded MCP server URL
const MCP_SERVER_URL = process.env.MCP_URL!;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

let mcpClient: Client | null = null;
let tools: any[] = [];

async function getMcpClient() {
  if (!mcpClient) {
    const transport = new StreamableHTTPClientTransport(
      new URL(MCP_SERVER_URL)
    );
    mcpClient = new Client({ name: "nextjs-mcp-client", version: "1.0.0" });
    await mcpClient.connect(transport);
    const toolsResult = await mcpClient.listTools();
    tools = toolsResult.tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
    console.log("Tools:", tools);
  }
  return mcpClient;
}

async function processQuery(
  query: string,
  mcp: Client,
  openai: OpenAI,
  tools: any[]
) {
  const messages: any[] = [
    {
      role: "user",
      content: query,
    },
  ];

  const allSteps: { type: string; value: string }[] = [];
  let done = false;

  while (!done) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1000,
      messages,
      tools,
      tool_choice: "auto",
    });

    const assistantMessage = response.choices[0].message;
    const toolResults: any[] = [];
    let hasToolUse = false;

    // Add assistant message to conversation
    messages.push(assistantMessage);

    if (assistantMessage.content) {
      allSteps.push({ type: "text", value: assistantMessage.content });
      done = true;
    }

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      hasToolUse = true;

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        allSteps.push({
          type: "tool_call",
          value: `[Calling tool ${toolName} with args ${JSON.stringify(
            toolArgs
          )}]`,
        });

        try {
          const result = await mcp.callTool({
            name: toolName,
            arguments: toolArgs,
          });

          const resultContent =
            typeof result.content === "string"
              ? result.content
              : JSON.stringify(result.content);

          allSteps.push({
            type: "tool_result",
            value: resultContent,
          });

          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            content: resultContent,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          allSteps.push({
            type: "tool_result",
            value: `Error: ${errorMessage}`,
          });
          toolResults.push({
            tool_call_id: toolCall.id,
            role: "tool",
            content: `Error: ${errorMessage}`,
          });
        }
      }
    }

    if (hasToolUse) {
      // Add tool results to messages
      messages.push(...toolResults);
      // Continue the loop for the next OpenAI response
    } else {
      done = true;
    }
  }

  return allSteps;
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }
    const mcp = await getMcpClient();
    const llm = new OpenAI({ apiKey: OPENAI_API_KEY });
    const allSteps = await processQuery(query, mcp, llm, tools);
    return NextResponse.json({ steps: allSteps });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
