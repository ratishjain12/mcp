# MCP Client-Server

This project is a full-stack chatbot system using the Model Context Protocol (MCP) for tool-calling, with a backend MCP server (Express) and a Next.js client that connects to OpenAI's GPT-4o and the MCP server. The frontend provides a modern chat UI.

---

## Project Structure

```
mcp/
  client/   # Next.js app (frontend + API route as MCP client)
  server/   # Express MCP server (tool provider)
```

---

## Prerequisites

- Node.js (v18+ recommended)
- npm (v9+ recommended)
- OpenAI API key
- (Optional) Anthropic API key (if you want to use Claude instead of OpenAI)

---

## 1. MCP Server Setup (`server/`)

The MCP server is an Express app that exposes an MCP endpoint and registers a simple "add-numbers" tool.

### Install dependencies

```bash
cd server
npm install
```

### Run the server (dev mode)

```bash
npm run dev
```

The server will start on [http://localhost:3000](http://localhost:3000) and expose the MCP endpoint at `/mcp`.

#### Tool Example

- **add-numbers**: Adds two numbers (`a` and `b`) and returns the sum.

---

## 2. Next.js Client Setup (`client/`)

The client is a Next.js app with a chat UI and an API route that acts as an MCP client, connecting to the MCP server and OpenAI.

### Install dependencies

```bash
cd client
npm install
```

### Environment Variables

Create a `.env.local` file in the `client/` directory with the following:

```
OPENAI_API_KEY=your_openai_api_key_here
MCP_URL=http://localhost:3000/mcp
```

- `OPENAI_API_KEY`: Your OpenAI API key (get from https://platform.openai.com/)
- `MCP_URL`: URL of your running MCP server

### Run the client (dev mode)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to use the chat UI.

---

## 3. How it Works

- The frontend chat UI sends user messages to `/api/chat`.
- The API route (`app/api/chat/route.ts`) connects to OpenAI's GPT-4o and the MCP server.
- If the LLM requests a tool call, the client invokes the MCP tool (e.g., "add-numbers") and returns the result to the LLM.
- The loop continues until the LLM produces a final response.
- All conversation steps (user, assistant, tool calls/results, errors) are displayed in the UI.

---

## 4. Customization

- **Add more tools:** Edit `server/index.ts` to register more tools with the MCP server.
- **Change LLM:** The client is set up for OpenAI GPT-4o by default. To use Anthropic Claude, adjust the API route and environment variables accordingly.
- **UI:** The chat UI uses shadcn/ui and Tailwind CSS for a modern look. Customize in `client/app/page.tsx` and `client/components/ui/`.

---

## 5. Example Usage

1. Start the MCP server:
   ```bash
   cd server
   npm run dev
   ```
2. Start the Next.js client:
   ```bash
   cd client
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) and chat with the bot. Try:
   ```
   Add 5 and 7.
   ```
   The bot will call the "add-numbers" tool and reply with the sum.

---

## 6. Troubleshooting

- **529 Overloaded Error:** The MCP server is overloaded. Try again later or reduce request frequency.
- **Tool call errors:** Errors are shown in the chat UI. Check server logs for details.
- **Environment variables:** Ensure `OPENAI_API_KEY` and `MCP_URL` are set correctly.

---

## 7. Dependencies

- [Next.js](https://nextjs.org/)
- [OpenAI Node SDK](https://www.npmjs.com/package/openai)
- [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [Express](https://expressjs.com/)
- [shadcn/ui](https://ui.shadcn.com/) (for UI components)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 8. License

MIT
