const state = {
  lastQuery: "",
  lastSession: null,
  busy: false
};

const DEFAULT_GLOBAL_API_BASE = "https://zpxhovwsswnjdjibcvsh.supabase.co/functions/v1/rag-research";
const configuredApiBase = window.KRUSE_RAG_CONFIG?.apiBase || "";
const apiBase = configuredApiBase || (window.location.hostname === "guyhouri.github.io" ? DEFAULT_GLOBAL_API_BASE : "");

const chatLog = document.querySelector("#chat-log");
const chatForm = document.querySelector("#chat-form");
const queryInput = document.querySelector("#query-input");
const sendButton = document.querySelector("#send-button");

function apiUrl(path) {
  if (!apiBase) return path;
  if (path === "/api/research") return apiBase;
  return `${apiBase}${path}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function selectedSourceTypes() {
  return [...document.querySelectorAll('input[name="sourceType"]:checked')].map((input) => input.value);
}

function inferSearchIntent(query) {
  const normalized = query.toLowerCase();
  if (/\b(case|cases|case[-\s]?style|anecdote|anecdotes|patient stor(?:y|ies)|people|users?|who tried|experience|experiences|forum examples?)\b/.test(normalized)) {
    return { focus: "cases", sourceTypes: ["forum"] };
  }
  if (/\b(quote|quotes|cite|citation|citations|source|sources|where did|exact)\b/.test(normalized)) {
    return { focus: "citations", sourceTypes: [] };
  }
  if (/\b(contradict|contradiction|contradictions|caveat|caveats|conflict|conflicts|changed his mind)\b/.test(normalized)) {
    return { focus: "contradictions", sourceTypes: [] };
  }
  if (/\b(protocol|protocols|candidate|candidates|intervention|interventions|what should|action steps?)\b/.test(normalized)) {
    return { focus: "protocols", sourceTypes: [] };
  }
  if (/\b(mechanism|mechanisms|pathway|pathways|how does|why does|mitochondria|redox)\b/.test(normalized)) {
    return { focus: "mechanisms", sourceTypes: [] };
  }
  return { focus: "all", sourceTypes: [] };
}

function buildPayload(query) {
  const selectedTypes = selectedSourceTypes();
  const intent = inferSearchIntent(query);
  return {
    query,
    filters: {
      sourceTypes: selectedTypes.length ? selectedTypes : intent.sourceTypes,
      focus: intent.focus,
      exactCitationsOnly: false,
      limit: 5
    }
  };
}

function scrollToBottom() {
  chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: "smooth" });
}

function appendMessage(role, html, className = "") {
  const article = document.createElement("article");
  article.className = `message ${role}-message ${className}`.trim();
  article.innerHTML = `<div class="message-body">${html}</div>`;
  chatLog.appendChild(article);
  scrollToBottom();
  return article;
}

function evidenceUrl(item) {
  const url = item.citation?.url;
  if (!url) return "";
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">Open source</a>`;
}

function renderEvidenceItem(item, index) {
  const title = item.citation?.title || item.metadata?.sourceId || "Untitled source";
  const section = item.citation?.section || "source passage";
  const sourceType = item.sourceType || "source";
  const score = Number.isFinite(item.score) ? item.score.toFixed(4) : "n/a";
  const snippet = item.snippet || item.text || "";
  return `
    <article class="evidence-item">
      <div class="evidence-title">
        <span>${index + 1}. ${escapeHtml(title)}</span>
        <span>${escapeHtml(sourceType)}</span>
      </div>
      <p class="evidence-section">${escapeHtml(section)} - score ${escapeHtml(score)}</p>
      ${snippet ? `<p>${escapeHtml(snippet)}</p>` : ""}
      ${evidenceUrl(item)}
    </article>
  `;
}

function renderRefinements(session) {
  const chips = session.refinementChips || [];
  if (session.evidence?.length) return "";
  if (!chips.length) return "";
  return `
    <div class="refinements">
      ${chips.map((chip) => `<button class="refinement-chip" type="button" data-query="${escapeHtml(chip.query)}">${escapeHtml(chip.label)}</button>`).join("")}
    </div>
  `;
}

function renderSearchDetails(session) {
  const diagnostics = session.diagnostics || {};
  const filters = session.filters || {};
  const sourceTypes = filters.sourceTypes?.length ? filters.sourceTypes.join(", ") : "all public sources";
  const intent = filters.focus && filters.focus !== "all" ? filters.focus : "general";
  const resultCount = diagnostics.retrieval?.resultCount ?? session.evidence?.length ?? 0;
  const status = session.queryQuality?.status || diagnostics.qualityStatus || "unknown";
  return `
    <details class="details-panel">
      <summary>How searched</summary>
      <dl>
        <div><dt>Intent</dt><dd>${escapeHtml(intent)}</dd></div>
        <div><dt>Query status</dt><dd>${escapeHtml(status)}</dd></div>
        <div><dt>Sources</dt><dd>${escapeHtml(sourceTypes)}</dd></div>
        <div><dt>Results</dt><dd>${escapeHtml(resultCount)}</dd></div>
      </dl>
    </details>
  `;
}

function answerSectionBody(session, id) {
  const sections = session.answerDraft?.sections || [];
  return sections.find((section) => section.id === id)?.body || "";
}

function renderSimpleAnswer(session) {
  const evidence = session.evidence || [];
  const focus = session.filters?.focus || "all";
  const patternSummary = answerSectionBody(session, "pattern-summary");
  const guidance = session.guidance?.body || "";
  let title = "Answer";
  let body = patternSummary || guidance || "I need a little more context before searching.";

  if (focus === "cases") {
    title = "Case search";
    body = evidence.length
      ? "I searched for case-style evidence and forum examples. The citations below are the useful starting points."
      : "I searched for case-style evidence and forum examples, but did not find a strong cited match. Try adding the condition, intervention, or exact Kruse term.";
  } else if (focus === "citations") {
    title = "Source search";
    body = evidence.length
      ? "I searched for directly citable source passages. Start with the cited matches below."
      : "I searched for directly citable passages, but did not find a strong match.";
  } else if (focus === "contradictions") {
    title = "Caveat search";
    body = evidence.length
      ? "I searched for caveats, conflicts, and source passages that may qualify the claim."
      : "I searched for caveats and conflicts, but did not find a strong cited match.";
  } else if (focus === "protocols") {
    title = "Protocol-source search";
    body = evidence.length
      ? "I searched for source passages that point to protocols or candidate interventions."
      : "I searched for protocol-style passages, but did not find a strong cited match.";
  }

  return `
    <section class="answer-section">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(body)}</p>
    </section>
  `;
}

function renderAssistant(session) {
  const evidence = session.evidence || [];
  const notice = session.notice
    ? `<p class="notice-line"><strong>${escapeHtml(session.notice.title)}:</strong> ${escapeHtml(session.notice.body)}</p>`
    : "";

  const evidenceBlock = evidence.length
    ? `
      <details class="details-panel evidence-panel" open>
        <summary>Citations (${evidence.length})</summary>
        <div class="evidence-list">
          ${evidence.map(renderEvidenceItem).join("")}
        </div>
      </details>
    `
    : "";

  return `
    ${notice}
    ${renderSimpleAnswer(session)}
    ${renderRefinements(session)}
    ${evidenceBlock}
    ${renderSearchDetails(session)}
  `;
}

function setBusy(isBusy) {
  state.busy = isBusy;
  sendButton.disabled = isBusy;
  queryInput.disabled = isBusy;
  sendButton.textContent = isBusy ? "Searching" : "Ask";
}

async function runQuery(query) {
  const payload = buildPayload(query);
  state.lastQuery = query;
  appendMessage("user", `<p>${escapeHtml(query)}</p>`);
  const loading = appendMessage("assistant", "<p>Searching the indexed sources...</p>", "loading-message");
  setBusy(true);

  try {
    const response = await fetch(apiUrl("/api/research"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const session = await response.json();
    if (!response.ok) {
      throw new Error(session.error || `Request failed with HTTP ${response.status}`);
    }
    state.lastSession = session;
    loading.querySelector(".message-body").innerHTML = renderAssistant(session);
    loading.classList.remove("loading-message");
  } catch (error) {
    loading.querySelector(".message-body").innerHTML = `
      <p>I could not reach the research backend.</p>
      <p class="error-line">${escapeHtml(error.message)}</p>
    `;
    loading.classList.remove("loading-message");
    loading.classList.add("error-message");
  } finally {
    setBusy(false);
    queryInput.focus();
    scrollToBottom();
  }
}

function resizeInput() {
  queryInput.style.height = "auto";
  queryInput.style.height = `${Math.min(queryInput.scrollHeight, 180)}px`;
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (state.busy) return;
  const query = queryInput.value.replace(/\s+/g, " ").trim();
  if (!query) return;
  queryInput.value = "";
  resizeInput();
  runQuery(query);
});

queryInput.addEventListener("input", resizeInput);
queryInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

chatLog.addEventListener("click", (event) => {
  const button = event.target.closest(".refinement-chip");
  if (!button || state.busy) return;
  const query = button.dataset.query || button.textContent || "";
  if (query.trim()) runQuery(query.trim());
});

resizeInput();
