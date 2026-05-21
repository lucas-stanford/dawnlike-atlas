import React, { useState, useCallback, useMemo } from 'react';
// Vite's `?raw` suffix gives us the file contents as a string at build time
// so the prompt is bundled with Storybook and works on the static site.
import gameTemplatePrompt from '../Example_LLM_Prompts/game-template.md?raw';
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
  title: 'Dawnlike/Prompts',
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

// Twenty starter pitches. Pick one in the dropdown; we drop it into the
// template's `<<<...>>>` slot so you can copy-paste a complete prompt
// without writing your idea from scratch.
const SAMPLE_IDEAS = [
  {
    label: 'Roguelike: classic dungeon crawl',
    idea: 'A turn-based roguelike. The player descends a 10-level dungeon, fighting rats, skeletons, and goblins, picking up potions, scrolls, and weapons. Permadeath; the only objective is to reach level 10 and grab the artifact.',
  },
  {
    label: 'Roguelike: vampire night-stalker',
    idea: 'A turn-based dungeon crawl where the player is a vampire who must drink blood every N turns or take damage. Enemies are villagers, priests, and silver-armed knights; sunlight tiles burn the player. The goal is to escape the catacombs before dawn.',
  },
  {
    label: 'Roguelike: necromancer minion-master',
    idea: 'Real-time roguelike: the player is a necromancer who never attacks directly. Slain enemies can be raised as up to 6 minions that fight for the player. Each dungeon level has a boss whose corpse unlocks a stronger summon.',
  },
  {
    label: 'Town-builder: medieval village',
    idea: 'A peaceful town-builder. The player places houses, fields, and shops on an overworld; villagers walk between them on the generated road network and trade goods. No combat — just keep happiness above zero.',
  },
  {
    label: 'Survival: stranded on a forest island',
    idea: 'Top-down survival. The player washes up on a forested island with hunger, thirst, and stamina meters. Chop trees, fish, build a shelter, and survive 30 in-game days until a rescue ship arrives.',
  },
  {
    label: 'Adventure: zelda-like grid quest',
    idea: 'A zelda-like top-down adventure on a hand-stitched overworld of biomes. Each region hides a small dungeon that grants a permanent ability (bow, key, lantern) needed to reach the next region. Real-time movement on a 32px grid.',
  },
  {
    label: 'Tower defense: kingdom under siege',
    idea: 'A tower-defense game on a procedural town map. Goblin waves spawn from forest edges and try to reach the central plaza; the player places archer towers, mage towers, and walls along the road network to stop them.',
  },
  {
    label: 'Stealth: thief in the king\'s vault',
    idea: 'Top-down stealth. The player is a thief sneaking through a noble\'s mansion. Guards have vision cones; getting spotted triggers a chase. The goal is to grab three artifacts and reach the rooftop exit unseen.',
  },
  {
    label: 'Farming: cosy harvest sim',
    idea: 'A cosy farming sim. The player has a small plot of land outside a procedural town; plant seeds, water them daily, harvest, sell crops in town, and slowly upgrade the farmhouse. Seasons rotate every 14 in-game days.',
  },
  {
    label: 'Trading: caravan merchant',
    idea: 'An overworld trading game. The player runs a caravan between five procedurally-placed towns, each with its own price list. Buy low, sell high, hire guards to fend off bandits on the road, and afford the legendary palace at the end.',
  },
  {
    label: 'Tactical: squad-based skirmish',
    idea: 'A tactical turn-based skirmish on a small grid map. The player commands a squad of 4 (knight, archer, mage, healer) against an AI squad of orcs. Action points per unit; line-of-sight matters. 12 hand-designed scenarios.',
  },
  {
    label: 'Mystery: detective on the moor',
    idea: 'A top-down detective mystery set in a single procedural village. NPCs walk routines you can observe; clues are hidden in furniture. The player has 3 in-game days to identify the killer and confront them at the inn.',
  },
  {
    label: 'Pirates: open-sea exploration',
    idea: 'An open-sea pirate game on an overworld of islands and water. The player sails a ship between procedurally-placed ports, fights other ships in turn-based broadside duels, and digs for buried treasure on coasts.',
  },
  {
    label: 'Bomberman-likes: blast the maze',
    idea: 'A bomberman-style arena game. Each level is a small grid with destructible crates; the player drops bombs to blow up enemies and reveal exits. Power-ups (bigger blast, more bombs, kick) drop from crates.',
  },
  {
    label: 'Sokoban: temple of pushed blocks',
    idea: 'A sokoban-style puzzle game set in an ancient temple. Each room is one puzzle: push gemstones onto pressure plates to open the door to the next. 40 hand-designed rooms, no enemies, no time pressure.',
  },
  {
    label: 'Tower-climber: ascending the spire',
    idea: 'A tower-climber roguelite: a single 30-floor spire where each floor is a small randomly-generated room with one objective (kill all enemies / reach the stairs / push a block). Death sends you to floor 1 with a shop in between runs.',
  },
  {
    label: 'Real-time strategy: tribal expansion',
    idea: 'A small-scale RTS. The player starts with a hut and three peasants on a procedural overworld. Gather wood/stone, build farms, train soldiers, and wipe out the rival tribe whose base spawns on the opposite corner.',
  },
  {
    label: 'Wave defense: the last inn',
    idea: 'A wave-survival game set in a single inn. Bandits, then orcs, then undead attack across 20 nights of escalating waves; between waves the player upgrades barricades, hires NPC defenders, and stocks the cellar with potions.',
  },
  {
    label: 'Deck-builder: dungeon-card crawl',
    idea: 'A deck-builder + map crawler. The player walks a procedural dungeon; combat is card-based (slay-the-spire-style), with cards picked up as loot. 3 floors, an elite per floor, and a final boss whose deck mirrors the player\'s.',
  },
  {
    label: 'Sandbox: tile-painting toy',
    idea: 'A no-objective tile-painting sandbox. The player walks a small overworld and clicks to place / erase trees, walls, water, and roads; the autotile resolver picks the right corner sprites automatically. Save the map to localStorage.',
  },
];

// Replace the `<<<...>>>` placeholder block with the chosen idea so the
// resulting prompt is paste-ready (markers and the placeholder hint
// inside them are dropped — the LLM just sees the idea body). Also
// drops the bolded "**Your game idea**" cross-reference in the intro
// paragraph so the prose reads naturally with a concrete idea inlined.
const PLACEHOLDER_RE = /<<<[\s\S]*?>>>/;
const INTRO_REF_RE = /Build the game described below in \*\*Your game idea\*\* using the/;
function withIdea(template, idea) {
  if (!idea) return template;
  return template
    .replace(PLACEHOLDER_RE, idea.trim())
    .replace(INTRO_REF_RE, 'Build the game described below using the');
}

function PromptPanel({ title, subtitle, body, header }) {
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
      {header}
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

function GameTemplateStory() {
  const [sampleIdx, setSampleIdx] = useState(-1);
  const idea = sampleIdx >= 0 ? SAMPLE_IDEAS[sampleIdx].idea : '';
  const body = useMemo(() => withIdea(gameTemplatePrompt, idea), [idea]);
  const header = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      margin: '0 0 10px',
      padding: '10px 12px',
      background: '#f1f4f8',
      border: '1px solid #d6dde6',
      borderRadius: 6,
      fontSize: 13,
      color: '#333',
    }}>
      <label htmlFor="dawnlike-sample-idea" style={{ fontWeight: 600 }}>
        Starter pitch:
      </label>
      <select
        id="dawnlike-sample-idea"
        value={sampleIdx}
        onChange={(e) => setSampleIdx(Number(e.target.value))}
        style={{
          flex: 1,
          padding: '6px 8px',
          fontSize: 13,
          border: '1px solid #b8c1cd',
          borderRadius: 4,
          background: '#fff',
        }}
      >
        <option value={-1}>— blank template (write your own) —</option>
        {SAMPLE_IDEAS.map((s, i) => (
          <option key={s.label} value={i}>{s.label}</option>
        ))}
      </select>
      {sampleIdx >= 0 && (
        <button
          type="button"
          onClick={() => setSampleIdx(-1)}
          style={{
            padding: '6px 10px',
            border: '1px solid #b8c1cd',
            borderRadius: 4,
            background: '#fff',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
  return (
    <PromptPanel
      title="Game template prompt"
      subtitle="Paste-and-go template: pick a starter pitch from the dropdown (or write your own in the <<<…>>> slot), then hand the whole textarea to Claude / GPT / Copilot to build it on top of dawnlike-atlas."
      body={body}
      header={header}
    />
  );
}

export const GameTemplate = {
  name: 'Game Template',
  render: () => <GameTemplateStory />,
};

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
