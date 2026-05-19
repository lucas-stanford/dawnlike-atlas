import React, { useState, useCallback } from 'react';
// Vite's `?raw` suffix gives us the file contents as a string at build time
// so the prompt is bundled with Storybook and works on the static site.
import simpleRoguelikePrompt from '../Example_LLM_Prompts/simple-roguelike.md?raw';

/**
 * Stories for the bundled LLM prompts.
 *
 * Each story renders a prompt verbatim inside a textarea with a Copy
 * button so you can paste the whole thing into Claude / GPT / Copilot
 * Chat and have the model rebuild the example from the linked source
 * files.
 */
export default {
  title: 'Prompts/LLM Prompts',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Self-contained prompts you can hand to an LLM to recreate examples from this repo. ' +
          'Every prompt links its required source files by raw-content URL so the model can ' +
          'fetch them itself.',
      },
    },
  },
};

function PromptPanel({ title, subtitle, body }) {
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(async () => {
    // Try the modern Clipboard API first, but fall back to a hidden
    // textarea + execCommand('copy') on failure (NotAllowedError in
    // sandboxed iframes, insecure origins, headless test browsers, etc.).
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = body;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.setAttribute('readonly', '');
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    };
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(body);
        ok = true;
      } else {
        ok = fallback();
      }
    } catch {
      ok = fallback();
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }, [body]);

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: 16,
      maxWidth: 980,
      margin: '0 auto',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 12,
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>{title}</h2>
          {subtitle && (
            <p style={{ margin: '4px 0 0', color: '#666', fontSize: 13 }}>{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onCopy}
          style={{
            padding: '8px 14px',
            border: '1px solid #888',
            borderRadius: 6,
            background: copied ? '#1f7a32' : '#222',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            minWidth: 140,
            transition: 'background 0.15s ease',
          }}
        >
          {copied ? 'Copied!' : 'Copy prompt'}
        </button>
      </div>
      <textarea
        value={body}
        readOnly
        spellCheck={false}
        onFocus={(e) => e.target.select()}
        style={{
          width: '100%',
          height: '70vh',
          minHeight: 420,
          padding: 12,
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: 12.5,
          lineHeight: 1.45,
          border: '1px solid #ccc',
          borderRadius: 6,
          background: '#fafafa',
          resize: 'vertical',
          whiteSpace: 'pre',
          boxSizing: 'border-box',
        }}
      />
      <p style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
        Tip: focus the textarea and press <kbd>⌘/Ctrl+A</kbd> then <kbd>⌘/Ctrl+C</kbd>{' '}
        if the button doesn't work in your browser.
      </p>
    </div>
  );
}

export const SimpleRoguelike = {
  name: 'Simple Roguelike',
  render: () => (
    <PromptPanel
      title="Simple Roguelike prompt"
      subtitle="Recreate the Phaser overworld + town + 3-level dungeon example. Paste into Claude / GPT / Copilot Chat."
      body={simpleRoguelikePrompt}
    />
  ),
};
