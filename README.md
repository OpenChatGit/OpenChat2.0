# OpenChat (v0.1.2)

OpenChat 2.0 is the successor to the legacy "OpenChat" project.

> Experimental Notice (v0.1.2): This release is experimental. Features, APIs, and UI are subject to change without prior notice.

> Status: The legacy OpenChat is deprecated and will not receive updates. OpenChat 2.0 replaces it.

---

## Notice

During an ongoing verification and review phase, installation and usage guides are intentionally withheld. If you already know how to work with the stack, you may proceed at your own discretion. Public guides will be added after the review concludes.

### Licensing rationale (summary)

For the current phase, the non‑commercial, no‑derivatives license was chosen as a precaution. There are concerns about potential copying/derivative reuse of prior work; while we cannot make specific statements for legal and privacy reasons, this temporary license helps protect the codebase during review and stabilization. The intent is to revisit the license as the project matures.

---

## Stability Note

The legacy "OpenChat" application has become unstable over time. It was created in an earlier phase of the project and lacks many of the architectural improvements we now apply by default. OpenChat 2.0 already demonstrates better stability and performance than the legacy app.

Key improvements in 2.0:

- More reliable backend integration (FastAPI + LangChain) with clear fallbacks.
- Streaming-first UI with robust non-stream fallback.
- Context-aware title generation and better conversation continuity.
- Cleaner, modernized frontend structure for faster response rendering.

As we iterate, we will continue to harden 2.0 and deprecate legacy components.

---

## License

OpenChat 2.0 is temporarily licensed under **CC BY-NC-ND 4.0**. See `LICENSE.md` for:

- Full notice and summary
- Name/Trademark notice (the name "OpenChat" is not licensed and may change)
- Effective date and 90‑day periodic review policy
