import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App, { NotesEditor, BriefResult } from "../src/App.jsx";
import {
  SAMPLE_BRIEF,
  SAMPLE_NOTES,
  validateBrief,
  toMarkdown,
} from "../src/brief.js";
import handler, { createBrief as realCreateBrief } from "../api/brief.js";
const createBrief = (notes, options) =>
  realCreateBrief(notes, {
    quotaStore: {
      reserve: async () => ({ allowed: true }),
      cooldown: async () => {},
    },
    ...options,
  });
describe("brief data contract", () => {
  it("accepts a complete brief", () =>
    expect(validateBrief(SAMPLE_BRIEF)).toEqual(SAMPLE_BRIEF));
  it.each([
    null,
    {},
    { ...SAMPLE_BRIEF, actions: [{}] },
    { ...SAMPLE_BRIEF, title: "" },
    { ...SAMPLE_BRIEF, questions: [4] },
  ])("rejects malformed output %#", (value) =>
    expect(() => validateBrief(value)).toThrow(),
  );
  it("exports completed actions and empty sections", () => {
    expect(toMarkdown(SAMPLE_BRIEF, [0])).toContain("- [x] Finish");
    expect(
      toMarkdown({
        ...SAMPLE_BRIEF,
        actions: [],
        questions: [],
        decisions: [],
      }),
    ).toContain("None recorded");
  });
});
describe("notes editor", () => {
  it("associates the label and preserves typed notes", () => {
    const set = vi.fn();
    render(
      <NotesEditor
        notes=""
        setNotes={set}
        onGenerate={() => {}}
        busy={false}
        onSample={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText("Start with the messy part."), {
      target: { value: "My notes" },
    });
    expect(set).toHaveBeenCalledWith("My notes");
    expect(
      screen.getByRole("button", { name: /Create my brief/ }),
    ).toBeDisabled();
  });
  it("prevents generating while busy", () => {
    render(
      <NotesEditor
        notes={SAMPLE_NOTES}
        setNotes={() => {}}
        onGenerate={() => {}}
        busy
        onSample={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /Finding/ })).toBeDisabled();
  });
});
describe("brief result", () => {
  it("shows grounded actions, and allows checking and exporting", () => {
    const toggle = vi.fn(),
      exporter = vi.fn(),
      copy = vi.fn();
    render(
      <BriefResult
        brief={SAMPLE_BRIEF}
        completed={[0]}
        toggle={toggle}
        onExport={exporter}
        onCopy={copy}
        copied={false}
        isSample
      />,
    );
    expect(screen.getByText("SAMPLE BRIEF")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")[0]).toBeChecked();
    fireEvent.click(screen.getAllByRole("checkbox")[1]);
    expect(toggle).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole("button", { name: /Export/ }));
    expect(exporter).toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText("Copy brief as Markdown"));
    expect(copy).toHaveBeenCalled();
  });
  it("handles no extracted facts honestly", () => {
    render(
      <BriefResult
        brief={{ ...SAMPLE_BRIEF, decisions: [], actions: [], questions: [] }}
        completed={[]}
        toggle={() => {}}
        onExport={() => {}}
        onCopy={() => {}}
      />,
    );
    expect(
      screen.getByText("No explicit action items found."),
    ).toBeInTheDocument();
  });
});
describe("workspace flow", () => {
  it("loads an explicitly labeled sample and clears the workspace", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Try a sample/ }));
    expect(screen.getByText("SAMPLE BRIEF")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /New brief/ }));
    expect(screen.getByLabelText("Start with the messy part.")).toHaveValue("");
  });
  it("generates a live brief", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ brief: SAMPLE_BRIEF }),
      }),
    );
    render(<App />);
    fireEvent.change(screen.getByLabelText("Start with the messy part."), {
      target: { value: SAMPLE_NOTES },
    });
    fireEvent.click(screen.getByRole("button", { name: /Create my brief/ }));
    await screen.findByText("READY TO GO");
    expect(fetch).toHaveBeenCalledWith(
      "/api/brief",
      expect.objectContaining({ method: "POST" }),
    );
  });
  it("keeps input and prior brief on service failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Quota reached" }),
      }),
    );
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Try a sample/ }));
    fireEvent.click(screen.getByRole("button", { name: /Create my brief/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Quota reached");
    expect(screen.getByLabelText("Start with the messy part.")).toHaveValue(
      SAMPLE_NOTES,
    );
    expect(screen.getByText("SAMPLE BRIEF")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Dismiss error"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("rejects malformed live responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ brief: {} }) }),
    );
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Try a sample/ }));
    fireEvent.click(screen.getByRole("button", { name: /Create my brief/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "incomplete brief",
    );
  });
});
describe("server boundary", () => {
  it("requires valid input and server credentials", async () => {
    expect((await createBrief("short", { key: "test" })).status).toBe(400);
    expect((await createBrief(SAMPLE_NOTES, { key: "" })).status).toBe(503);
  });
  it("extracts validated structured output", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          { content: { parts: [{ text: JSON.stringify(SAMPLE_BRIEF) }] } },
        ],
      }),
    });
    expect(
      (await createBrief(SAMPLE_NOTES, { key: "test", fetcher })).body.brief,
    ).toEqual(SAMPLE_BRIEF);
    const sent = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(sent.generationConfig.responseMimeType).toBe("application/json");
  });
  it.each([429, 403, 500])("maps provider error %i safely", async (status) => {
    const result = await createBrief(SAMPLE_NOTES, {
      key: "test",
      fetcher: async () => ({ ok: false, status }),
    });
    expect(result.status).toBe(status === 429 ? 429 : 503);
    expect(result.body.error).not.toContain("test");
  });
  it("handles invalid JSON, blocked output, and timeouts", async () => {
    for (const data of [
      {},
      { candidates: [{ content: { parts: [{ text: "bad json" }] } }] },
    ])
      expect(
        (
          await createBrief(SAMPLE_NOTES, {
            key: "test",
            fetcher: async () => ({ ok: true, json: async () => data }),
          })
        ).status,
      ).toBe(502);
    expect(
      (
        await createBrief(SAMPLE_NOTES, {
          key: "test",
          fetcher: async () => {
            throw Object.assign(new Error(), { name: "TimeoutError" });
          },
        })
      ).body.error,
    ).toContain("too long");
  });
  it("rejects unsupported methods and malformed bodies", async () => {
    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    await handler({ method: "GET" }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    await handler({ method: "POST", body: "{" }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    await handler({ method: "POST", body: { notes: "short" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("quota countdown UI", () => {
  it("keeps the sample available but prevents more AI calls during cooldown", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Please wait", retryAfter: 120 }),
      }),
    );
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Try a sample/ }));
    fireEvent.click(screen.getByRole("button", { name: /Create my brief/ }));
    expect(
      await screen.findByRole("button", { name: "Try again in 2 min" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /New brief/ }));
    fireEvent.click(screen.getByRole("button", { name: /Try a sample/ }));
    expect(
      screen.getByRole("button", { name: "Try again in 2 min" }),
    ).toBeDisabled();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByText("SAMPLE BRIEF")).toBeInTheDocument();
  });
});

it.each([400, 401, 403, 404])(
  "distinguishes provider configuration failure %i from transient overload",
  async (status) => {
    const result = await createBrief(SAMPLE_NOTES, {
      key: "test",
      fetcher: async () => ({ ok: false, status }),
    });
    expect(result.status).toBe(503);
    expect(result.body.error).toContain("current server configuration");
    expect(result.body.error).not.toContain("temporarily unavailable");
  },
);
