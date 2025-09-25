import type { ExportPost } from './conversationExport';

/**
 * Builds a standalone HTML viewer that loads the exported JSON (via fetch or file input) and renders it.
 * The HTML contains inline CSS and JS, no external dependencies.
 */
export function buildConversationHtml(exportData: ExportPost, options?: { jsonFileName?: string; titleOverride?: string }): string {
  const jsonFileName = options?.jsonFileName || 'conversation.json';
  const pageTitle = options?.titleOverride || exportData.Title || 'Conversation';

  // Simple CSS consistent with app styling philosophy (dark background, readable text), but minimal
  const css = `
  :root {
    --color-background: #0F0F0F;
    --color-elevation: #181818;
    --color-text-primary: #F5F5F5;
    --color-text-secondary: #B0B0B0;
    --color-border: rgba(245, 245, 245, 0.1);
    --color-accent: #5E8BFF;
    /* Conversation Type Colors (match app) */
    --color-question: #5E8BFF;
    --color-problem: #FF4F5A;
    --color-dilemma: #F5A623;
    --color-solution: #29D398;
  }
  html, body { background: var(--color-background); color: var(--color-text-primary); font-family: Inter, system-ui, -apple-system, sans-serif; margin: 0; }
  .container { width: min(900px, 92%); margin: 24px auto; }
  .header { margin-bottom: 16px; }
  .type { text-transform: uppercase; font-size: 0.9rem; letter-spacing: .5px; color: var(--type-color, var(--color-accent)); }
  h1 { font-size: 1.8rem; margin: 6px 0 12px; }
  .card { background: var(--color-elevation); border-radius: 8px; padding: 16px; margin: 12px 0; }
  .meta { color: var(--color-text-secondary); font-size: .9rem; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--color-border); }
  .title { font-weight: 700; margin-bottom: 6px; }
  .body { white-space: pre-line; line-height: 1.6; }
  .depth { margin-left: calc(var(--depth, 0) * 24px); }
  .actions { margin: 16px 0; }
  input[type=file] { color: var(--color-text-primary); }
  .note { color: var(--color-text-secondary); font-size: 0.9rem; margin-top: 8px; }
  `;

  // Inline script that tries to fetch the JSON; otherwise allows manual file selection
  const script = `
  const container = document.getElementById('root');
  const fileInput = document.getElementById('jsonFile');
  const fetchInfo = document.getElementById('fetchInfo');
  let rootType = '';
  function getTypeColor(rootType, isComment) {
    if (isComment) return 'var(--color-text-secondary)';
    switch (String(rootType || '').toUpperCase()) {
      case 'QUESTION': return 'var(--color-question)';
      case 'PROBLEM': return 'var(--color-problem)';
      case 'DILEMMA': return 'var(--color-dilemma)';
      default: return 'var(--color-text-primary)';
    }
  }

  function el(tag, className, text) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function renderNode(node, depth) {
    const wrap = el('div', 'card depth');
    wrap.style.setProperty('--depth', depth);

    // Show post type header for non-root posts
    if (node.PostType) {
      const typeHeader = el('div', 'type', String(node.PostType));
      const isComment = String(node.PostType).toLowerCase() === 'comment';
      typeHeader.style.setProperty('--type-color', getTypeColor(rootType, isComment));
      wrap.appendChild(typeHeader);
    }

    if (node.Title) {
      wrap.appendChild(el('div', 'title', node.Title));
    }
    wrap.appendChild(el('div', 'body', node.MessageBody || ''));
    const meta = el('div', 'meta', 'by ' + String(node.Author) + ' • ' + String(node.UpdatedAt));
    wrap.appendChild(meta);

    // Append this post before its children to maintain correct order
    container.appendChild(wrap);

    if (Array.isArray(node.Posts)) {
      for (const child of node.Posts) {
        renderNode(child, depth + 1);
      }
    }
  }

  function renderConversation(data) {
    container.innerHTML = '';
    const headerCard = el('div', 'card');
    if (data.Type) {
      rootType = String(data.Type).toUpperCase();
      const t = el('div', 'type', String(data.Type).toLowerCase());
      t.style.setProperty('--type-color', getTypeColor(rootType, false));
      headerCard.appendChild(t);
    }
    if (data.Title) {
      headerCard.appendChild(el('h1', null, data.Title));
    }
    if (data.MessageBody) headerCard.appendChild(el('div', 'body', data.MessageBody));
    const meta = el('div', 'meta', 'by ' + String(data.Author) + ' • ' + String(data.UpdatedAt));
    headerCard.appendChild(meta);

    container.appendChild(headerCard);

    if (Array.isArray(data.Posts) && data.Posts.length) {
      for (const child of data.Posts) {
        // Each child should have its own container (card) and indentation
        renderNode(child, 1);
      }
    } else {
      const none = el('div', 'note');
      none.textContent = 'No responses yet.';
      container.appendChild(none);
    }
  }

  async function tryFetchDefault() {
    try {
      const res = await fetch('${jsonFileName}', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      renderConversation(data);
      fetchInfo.textContent = 'Loaded from ' + '${jsonFileName}';
    } catch (err) {
      fetchInfo.textContent = 'Could not auto-load ${jsonFileName}. Select the exported JSON file below:';
      fileInput.style.display = 'inline-block';
    }
  }

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const data = JSON.parse(text);
    renderConversation(data);
    const actions = document.querySelector('.actions');
    if (actions) actions.style.display = 'none';
  });

  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(pageTitle)} - Conversation Export</title>
  <style>${css}</style>
</head>
<body>
  <div class="container">
    <div class="actions">
      <span id="fetchInfo" class="note">Select your exported JSON file (suggested: ${jsonFileName})</span>
      <input id="jsonFile" type="file" accept="application/json" style="display:inline-block; margin-left:8px;" />
    </div>
    <div id="root"></div>
  </div>
  <script>${script}</script>
</body>
</html>`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
