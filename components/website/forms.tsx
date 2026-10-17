"use client";
import { useEffect, useState, type FormEvent } from "react";
type Answer = { answer: string; sources: { title: string; url: string }[] };
export function AssistantForm({ suggestions }: { suggestions: string[] }) {
  const [question, setQuestion] = useState(""),
    [answer, setAnswer] = useState<Answer | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function ask(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setAnswer(null);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.error);
      setAnswer(value);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to answer.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <form onSubmit={ask}>
        <label htmlFor="question">Your gemstone question</label>
        <textarea
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
          maxLength={500}
          rows={3}
        />
        <button disabled={busy}>
          {busy ? "Checking approved sources…" : "Ask KhyatiGems"}
        </button>
      </form>
      {suggestions.length > 0 && (
        <div className="suggestions">
          <p>Questions in the library</p>
          {suggestions.map((q) => (
            <button
              className="secondary"
              key={q}
              onClick={() => setQuestion(q)}
            >
              {q}
            </button>
          ))}
        </div>
      )}
      <div role="status" aria-live="polite">
        {message}
        {answer && (
          <div className="answer">
            <p>{answer.answer}</p>
            {answer.sources.map((s) => (
              <a key={s.url} href={s.url}>
                {s.title} →
              </a>
            ))}
            <p>
              <a href="/contact">Contact the KhyatiGems team</a>
            </p>
          </div>
        )}
      </div>
    </>
  );
}
export function ContactForm() {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget,
      values = new FormData(form);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.get("name"),
          email: values.get("email"),
          subject: values.get("subject"),
          message: values.get("message"),
          consent: values.get("consent") === "on",
          website: values.get("website"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage(
        "Your enquiry has been saved for the KhyatiGems team." +
          (result.reference ? ` Enquiry number: ${result.reference}.` : "") +
          (result.acknowledgement === "sent"
            ? " An acknowledgement email has been sent."
            : result.acknowledgement === "queued"
              ? " Your acknowledgement email is queued."
              : ""),
      );
      form.reset();
      window.dispatchEvent(new Event("kg-enquiry-saved"));
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Unable to save the enquiry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={send}
      method="post"
      action="/api/contact"
      className="contact-form"
    >
      <noscript>
        <p>
          Please enable JavaScript to submit the form, or use the contact
          details above.
        </p>
      </noscript>
      <fieldset disabled={busy || !ready}>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          autoComplete="name"
          required
          maxLength={120}
        />
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={200}
        />
        <label htmlFor="subject">Subject</label>
        <input id="subject" name="subject" required maxLength={180} />
        <label htmlFor="message">Your enquiry</label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          maxLength={6000}
          rows={6}
        />
        <div className="honeypot" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <label className="check">
          <input type="checkbox" name="consent" required /> I agree to send
          these details to KhyatiGems to handle my enquiry.{" "}
          <a href="/privacy">Privacy notice</a>
        </label>
        <button>{busy ? "Sending…" : "Send enquiry"}</button>
      </fieldset>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </form>
  );
}
