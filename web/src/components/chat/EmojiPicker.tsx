"use client";

import { useState } from "react";

const EMOJI_GROUPS = [
  { label: "Smileys", emojis: ["😀","😁","😂","🤣","😃","😄","😅","😆","😇","😉","😊","🙂","🙃","😋","😌","😍","🥰","😘","😗","😙","😚","😜","🤪","😝","😛","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","😮","🤯","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿"] },
  { label: "People", emojis: ["👋","🤚","🖐","✋","🖖","👌","🤌","✌","🤞","🤟","🤘","👈","👉","👆","👇","☝","👍","👎","✊","👊","🤛","🤜","👏","🙌","🤲","🤝","🙏","💪","🦾","🦵","🦶","👂","🦻","👃","🫀","🫁","🧠","🦷","👀","👁","👅","👄"] },
  { label: "Animals", emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🦆","🦅","🦉","🦇","🐝","🪱","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🕷","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🦭","🐊","🐅","🐆","🦓","🦍","🦧","🦣","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🐐","🦙","🐕","🐩","🦮","🐈","🐓","🦃","🦤","🦚","🦜","🦢","🕊","🐇","🦝","🦨","🦡","🦫","🦦","🦥","🐁","🐀","🐿","🦔"] },
  { label: "Food", emojis: ["🍎","🍊","🍋","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶","🫑","🧄","🧅","🥔","🍠","🥐","🥖","🍞","🥨","🥯","🧀","🥚","🍳","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟","🍕","🫓","🥙","🧆","🌮","🌯","🫔","🥗","🥘","🫕","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🦪","🍤","🍙","🍚","🍘","🍥","🥮","🍢","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🌰","🥜","🍯","🧃","🥤","🧋","☕","🍵","🫖","🍺","🍻","🥂","🍷","🥃","🍹","🧉","🍾"] },
  { label: "Travel", emojis: ["🚗","🚕","🚙","🚌","🚎","🏎","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🏍","🛵","🚲","🛴","🛺","🚍","🚘","🚖","✈","🛫","🛬","🛩","💺","🚀","🛸","🚁","🛶","⛵","🚤","🛥","🛳","⛴","🚢","🏄","🚣","🤽","🏊","🧗","🚵","🏇","🚴","🏋","🤸","🤼","🤺","⛷","🏂","🪂","🏌","🏄","🤾","🏸","🏒","🏑","🥍","🏓","🏸","🥊","🥋","🎽","🛹","🛼","🛷","⛸","🥅","⛳","🎯","🎱","🎰","🎲"] },
  { label: "Objects", emojis: ["❤","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣","💕","💞","💓","💗","💖","💘","💝","✨","⭐","🌟","💫","⚡","🔥","💥","🎉","🎊","🎈","🎁","🎀","🏆","🥇","🥈","🥉","🎖","🏅","🎗","🎫","🎟","🎪","🤹","🎭","🎨","🎬","🎤","🎧","🎼","🎵","🎶","🎹","🥁","🪘","🎷","🎺","🎸","🪕","🎻","🎮","🕹","🎯","🎱","🎳","🎰","🧩","🪆","🪅","🎭","🖼","🧸","🪀","🪁","🏮","🧨","🎑","🎐","🧧"] },
];

export default function EmojiPicker({ onSelectAction }: { onSelectAction: (emoji: string) => void }) {
  const [activeGroup, setActiveGroup] = useState(0);

  return (
    <div className="absolute bottom-full mb-2 right-0 w-72 bg-surface-container border border-white/80 rounded-2xl shadow-lg overflow-hidden z-50">
      {/* Group tabs */}
      <div className="flex border-b border-surface-container-high overflow-x-auto no-scrollbar">
        {EMOJI_GROUPS.map((g, i) => (
          <button
            key={g.label}
            onClick={() => setActiveGroup(i)}
            className={`shrink-0 px-3 py-2 text-[11px] font-semibold transition-colors ${
              activeGroup === i
                ? "text-primary border-b-2 border-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>
      {/* Emoji grid */}
      <div className="grid grid-cols-8 gap-0.5 p-2 max-h-48 overflow-y-auto custom-scrollbar">
        {EMOJI_GROUPS[activeGroup].emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelectAction(emoji)}
            className="text-xl leading-none p-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
