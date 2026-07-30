"use client";

import { useState } from "react";
import { createRakunApiClient } from "@rakun-kit/next/web/client";
import { useT } from "@rakun-kit/next/web/client";

import type { ApiOperations } from "../server/api-operations";

const apiClient = createRakunApiClient<ApiOperations>({
  baseUrl: "/api",
});

export default function HelloWorld({
  text = "Hello World",
}: {
  text?: string;
}) {
  const t = useT();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [mailTo, setMailTo] = useState("delivered@resend.dev");
  const [mailMessage, setMailMessage] = useState("");
  const [mailError, setMailError] = useState("");
  const [sendingMail, setSendingMail] = useState(false);

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

  const sendTestMail = async () => {
    setSendingMail(true);
    setMailError("");
    setMailMessage("");

    try {
      const result = await apiClient.mutation("demo.sendTestMail", {
        to: mailTo,
        name: text,
        activationUrl: "https://example.com/activate",
      });

      setMailMessage(`Mail accepted with id ${result.id}`);
    } catch (apiError) {
      setMailError(
        apiError instanceof Error ? apiError.message : "Unknown mail error",
      );
    } finally {
      setSendingMail(false);
    }
  };

  return (
    <section className="mx-auto flex h-[calc(100vh-130px)] max-w-5xl flex-col items-start justify-center gap-5 px-6 py-16">
      <h1 className="text-5xl font-semibold tracking-normal text-zinc-950">
        {text}
      </h1>
      <p className="max-w-2xl text-base font-medium text-emerald-700">
        {t({ key: "test.hello", values: { name: text } })}
      </p>

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

      <form
        className="flex w-full max-w-xl flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void sendTestMail();
        }}
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800">
          Send test mail to
          <input
            type="email"
            required
            value={mailTo}
            onChange={(event) => setMailTo(event.target.value)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-zinc-950 shadow-sm outline-none focus:border-zinc-500"
            placeholder="you@example.com"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={sendingMail}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-400"
          >
            {sendingMail ? "Sending..." : "Send test mail"}
          </button>

          {mailMessage ? (
            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {mailMessage}
            </span>
          ) : null}

          {mailError ? (
            <span className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              {mailError}
            </span>
          ) : null}
        </div>
      </form>
    </section>
  );
}
