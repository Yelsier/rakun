"use client";

import { useState } from "react";
import { createRakunApiClient } from "@rakun-kit/next/web/client";

import type { ApiOperations } from "../server/api-operations";

const apiClient = createRakunApiClient<ApiOperations>({
  baseUrl: "/api",
});

export default function HelloWorld({
  text = "Hello World",
}: {
  text?: string;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  const testApiCall = async () => {
    setRunning(true);
    setError("");
    setMessage("");

    try {
      const result = await apiClient.query("demo.helloWorld", { text });

      setMessage(result.message);
    } catch (apiError) {
      setError(
        apiError instanceof Error ? apiError.message : "Unknown API error",
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="mx-auto flex min-h-80 max-w-5xl flex-col items-start justify-center gap-5 px-6 py-16">
      <h1 className="text-5xl font-semibold tracking-normal text-zinc-950">
        {text}
      </h1>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void testApiCall()}
          disabled={running}
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {running ? "Testing..." : "Test hello API"}
        </button>

        {message ? (
          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {message}
          </span>
        ) : null}

        {error ? (
          <span className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            {error}
          </span>
        ) : null}
      </div>
    </section>
  );
}
