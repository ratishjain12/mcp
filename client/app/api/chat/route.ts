/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { Anthropic } from "@anthropic-ai/sdk";
import {
  MessageParam,
  Tool,
} from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// Hardcoded MCP server URL
const MCP_SERVER_URL = process.env.MCP_URL!;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

let mcpClient: Client | null = null;
let tools: Tool[] = [];

async function getMcpClient() {
  if (!mcpClient) {
    const transport = new StreamableHTTPClientTransport(
      new URL(MCP_SERVER_URL)
    );
    mcpClient = new Client({ name: "nextjs-mcp-client", version: "1.0.0" });
    await mcpClient.connect(transport);
    const toolsResult = await mcpClient.listTools();
    tools = toolsResult.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));
    console.log("Tools:", tools);
  }
  return mcpClient;
}

async function processQuery(
  query: string,
  mcp: Client,
  anthropic: Anthropic,
  tools: Tool[]
) {
  const messages: MessageParam[] = [
    {
      role: "user",
      content: query,
    },
  ];

  const allSteps: { type: string; value: string }[] = [];
  let done = false;

  while (!done) {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      messages,
      tools,
    });

    const toolResults: any[] = [];
    let hasToolUse = false;

    for (const content of response.content) {
      if (content.type === "text") {
        allSteps.push({ type: "text", value: content.text });
        done = true;
      } else if (content.type === "tool_use") {
        hasToolUse = true;
        const toolName = content.name;
        const toolArgs = content.input as { [x: string]: unknown } | undefined;
        const result = await mcp.callTool({
          name: toolName,
          arguments: toolArgs,
        });
        allSteps.push({
          type: "tool_call",
          value: `[Calling tool ${toolName} with args ${JSON.stringify(
            toolArgs
          )}]`,
        });
        allSteps.push({
          type: "tool_result",
          value:
            typeof result.content === "string"
              ? result.content
              : JSON.stringify(result.content),
        });
        toolResults.push({
          type: "tool_result",
          tool_use_id: content.id,
          content:
            typeof result.content === "string"
              ? result.content
              : JSON.stringify(result.content),
        });
      }
    }

    if (hasToolUse) {
      messages.push({
        role: "user",
        content: toolResults as any,
      });
      // Continue the loop for the next Anthropic response
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
    const llm = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const allSteps = await processQuery(query, mcp, llm, tools);
    return NextResponse.json({ steps: allSteps });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
