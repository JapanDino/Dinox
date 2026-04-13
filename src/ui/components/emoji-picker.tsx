"use client";

import { useMemo, useRef, useState } from "react";

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "⭐ Popular",
    emojis: [
      "⭐","🔥","💡","✅","❌","💬","📌","🎯","🚀","💪","👍","❤️","🙌","⚡","🏆",
      "📊","📈","💼","🛠️","🎉","✨","🔑","📝","💎","🌟","🎁","🔔","🏠","🎓","💰",
    ],
  },
  {
    label: "😊 Smileys",
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😊","😇","🥰","😍","🤩","😘",
      "😗","😚","😙","🥲","😋","😛","😜","😝","🤑","🤗","🤭","🤫","🤔","🫡","😐",
      "😑","😶","😶‍🌫️","😏","😒","🙄","😬","🤥","😔","😪","🥱","😴","😷","🤒","🤕",
    ],
  },
  {
    label: "🧑 People",
    emojis: [
      "👋","🤚","🖐️","✋","🖖","🤙","💪","🦾","🦿","🖕","✌️","🤞","🖖","🤟","🤘",
      "👆","👇","👈","👉","👍","👎","✊","👊","🤛","🤜","🙏","👏","🫶","🤲","🤝",
      "🧑","👨","👩","🧒","👦","👧","👶","🧓","👴","👵","👼","🤶","🎅","🧙","🧚",
    ],
  },
  {
    label: "🐾 Animals",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐙",
      "🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐝","🪱","🐛","🦋","🐌","🐞","🐜","🪲",
      "🐠","🐟","🐡","🐬","🦈","🐳","🦋","🦄","🐲","🦕","🦖","🐢","🐊","🦎","🐍",
    ],
  },
  {
    label: "🍕 Food",
    emojis: [
      "🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥",
      "🥝","🍅","🫒","🥑","🍆","🥦","🥕","🌽","🌶️","🧄","🧅","🥔","🍠","🍞","🥐",
      "🍕","🌮","🌯","🥙","🧆","🥚","🍳","🥘","🍲","🫕","🥣","🥗","🍱","🍜","🍝",
    ],
  },
  {
    label: "⚽ Activities",
    emojis: [
      "⚽","🏀","🏈","⚾","🎾","🏉","🏐","🎯","🏹","🎱","🏓","🏸","🥊","🥋","🤸",
      "🎮","🕹️","🎲","♟️","🎭","🎨","🖌️","🎬","📽️","🎼","🎵","🎶","🎤","🎸","🎹",
      "🏋️","🤼","🤺","🤾","🏇","⛷️","🏂","🏄","🚣","🧗","🚴","🏊","🤽","🧘","🧗",
    ],
  },
  {
    label: "🌍 Travel",
    emojis: [
      "🚀","✈️","🚂","🚗","🚕","🏎️","🚙","🚌","🚎","🏍️","🛵","🚲","🛴","🛺","🚁",
      "⛵","🚢","🛳️","🌍","🌎","🌏","🗺️","🗾","🧭","🏔️","⛰️","🌋","🏕️","🏖️","🏜️",
      "🏗️","🏘️","🏛️","🏟️","🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫",
    ],
  },
  {
    label: "💼 Work",
    emojis: [
      "💼","📁","📂","🗂️","📋","📊","📈","📉","📝","✏️","🖊️","🖋️","📌","📍","📎",
      "🖇️","📏","📐","✂️","🗃️","🗄️","🗑️","🖥️","💻","⌨️","🖱️","🖨️","📱","📞","☎️",
      "📟","📠","📷","📸","📹","🎥","🔦","💡","🔋","🔌","🔧","🔨","⚙️","🔩","🪛",
    ],
  },
  {
    label: "💡 Symbols",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗",
      "💖","💘","💝","💟","☮️","✝️","☪️","🔯","☯️","✡️","🕉️","☸️","🛐","⛎","♈",
      "⭐","🌟","✨","💫","⚡","🔥","💥","🌈","☀️","🌤️","⛅","🌦️","🌧️","⛈️","❄️",
    ],
  },
];

const ALL_EMOJIS = EMOJI_CATEGORIES.flatMap((c) => c.emojis);

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!search.trim()) return null;
    return ALL_EMOJIS.filter((e) => {
      // Simple match: if the search string is contained in the emoji string itself (works for emoji chars)
      return e.includes(search.trim());
    });
  }, [search]);

  const displayEmojis = results ?? EMOJI_CATEGORIES[activeCategory]?.emojis ?? [];

  return (
    <div
      ref={ref}
      className="z-50 flex w-72 flex-col overflow-hidden rounded-2xl border border-[var(--app-border-strong)] bg-[var(--app-surface)] shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
      style={{ maxHeight: "360px" }}
    >
      {/* Search */}
      <div className="border-b border-[var(--app-border)] px-3 py-2">
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emojis..."
          className="w-full bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]"
        />
      </div>

      {/* Categories */}
      {!search && (
        <div className="flex gap-0.5 overflow-x-auto border-b border-[var(--app-border)] px-2 py-1.5 scrollbar-none">
          {EMOJI_CATEGORIES.map((cat, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveCategory(i)}
              title={cat.label}
              className={`flex-shrink-0 rounded-md px-1.5 py-0.5 text-xs transition ${
                activeCategory === i
                  ? "bg-[var(--app-accent)] text-[var(--app-bg)]"
                  : "text-[var(--app-muted)] hover:bg-[var(--app-surface-2)]"
              }`}
            >
              {cat.emojis[0]}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="grid grid-cols-8 gap-0.5 overflow-y-auto p-2">
        {displayEmojis.map((emoji, i) => (
          <button
            key={`${emoji}-${i}`}
            type="button"
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition hover:bg-[var(--app-surface-2)]"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
        {displayEmojis.length === 0 && (
          <p className="col-span-8 py-4 text-center text-xs text-[var(--app-muted)]">No emojis found</p>
        )}
      </div>

      {/* Clear button */}
      <div className="border-t border-[var(--app-border)] px-3 py-1.5">
        <button
          type="button"
          onClick={() => {
            onSelect("");
            onClose();
          }}
          className="text-[11px] text-[var(--app-muted)] hover:text-[var(--app-text)] transition"
        >
          Clear emoji
        </button>
      </div>
    </div>
  );
}
