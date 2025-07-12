"use client";
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Step = {
  type: string;
  value: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Step[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    if (!input.trim()) return;
    setLoading(true);
    setMessages((msgs) => [...msgs, { type: "user", value: input }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input }),
      });
      const data = await res.json();
      if (data.steps) {
        setMessages((msgs) => [...msgs, ...data.steps]);
      } else if (data.error) {
        setMessages((msgs) => [...msgs, { type: "error", value: data.error }]);
      }
    } catch (err: any) {
      setMessages((msgs) => [...msgs, { type: "error", value: err.message }]);
    }
    setInput("");
    setLoading(false);
  }

  function renderStep(step: Step, i: number) {
    if (step.type === "user") {
      return (
        <div key={i} className="flex justify-end mb-2">
          <div className="flex items-end gap-2">
            <div className="bg-primary text-primary-foreground rounded-2xl px-4 py-2 max-w-xs break-words shadow">
              {step.value}
            </div>
            <Avatar className="w-8 h-8">
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          </div>
        </div>
      );
    }
    if (step.type === "text") {
      return (
        <div key={i} className="flex justify-start mb-2">
          <div className="flex items-end gap-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback>A</AvatarFallback>
            </Avatar>
            <div className="bg-muted text-muted-foreground rounded-2xl px-4 py-2 max-w-xs break-words shadow">
              {step.value}
            </div>
          </div>
        </div>
      );
    }
    if (step.type === "tool_call") {
      return (
        <div key={i} className="text-xs text-muted-foreground italic my-2">
          {step.value}
        </div>
      );
    }
    if (step.type === "tool_result") {
      return (
        <div key={i} className="text-xs text-blue-600 my-2">
          <b>Tool Result:</b> {step.value}
        </div>
      );
    }
    if (step.type === "error") {
      return (
        <div key={i} className="text-xs text-red-600 my-2">
          <b>Error:</b> {step.value}
        </div>
      );
    }
    return null;
  }

  return (
    <div className="min-h-screen p-4 flex flex-col items-center bg-background">
      <Card className="w-full flex flex-col h-[90vh] mt-8">
        <CardHeader>
          <CardTitle className="text-center">MCP Chat</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-y-auto px-2 pb-2">
          {messages.map(renderStep)}
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm mt-2">
              <span className="animate-spin inline-block w-4 h-4 border-2 border-t-transparent border-primary rounded-full" />
              Assistant is typing...
            </div>
          )}
          <div ref={chatEndRef} />
        </CardContent>
        <form
          className="flex gap-2 p-2 border-t bg-background sticky bottom-0"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type your message..."
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            Send
          </Button>
        </form>
      </Card>
    </div>
  );
}
