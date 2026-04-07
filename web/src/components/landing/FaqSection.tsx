"use client";

import { useState } from "react";

const faqs = [
  {
    question: "What is Groupys?",
    answer:
      "Groupys is a community-based music platform where you can join music communities, rate albums and tracks, match with people who share your taste, and share weekly hot takes about what you're listening to.",
  },
  {
    question: "How does Frequency Match work?",
    answer:
      "Frequency Match compares your genre preferences, favourite artists, and listening habits against other users to generate a compatibility score. The higher the score, the more aligned your musical tastes are.",
  },
  {
    question: "Is Groupys free?",
    answer:
      "Groupys is currently in private beta and free for all users. We'll announce any future pricing well in advance.",
  },
  {
    question: "What is the Weekly Hot Take?",
    answer:
      "Once a week, post your take — an album worth more attention, something overrated, a hidden gem. It shows up on your profile so others can see where you stand.",
  },
  {
    question: "How do music communities work?",
    answer:
      "Communities are genre or artist-based spaces where members post, comment, rate albums, and discuss music. Each community is built around a shared taste — whether that's an artist, a genre, or a vibe.",
  },
  {
    question: "What platforms is Groupys available on?",
    answer:
      "Groupys is being built for iOS and Android. You can join the waitlist now to get early access when we launch.",
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-surface-container last:border-0">
      <button
        className="w-full flex items-center justify-between gap-4 py-6 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="font-semibold text-on-surface">{question}</span>
        <span
          className="material-symbols-outlined text-primary shrink-0 transition-transform duration-300"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          expand_more
        </span>
      </button>
      {open && (
        <p className="pb-6 text-on-surface-variant leading-relaxed">{answer}</p>
      )}
    </div>
  );
}

export default function FaqSection() {
  return (
    <section className="py-20 md:py-32 border-t border-surface-container" id="faq">
      <div className="max-w-3xl mx-auto px-6 sm:px-8">
        <div className="text-center mb-16">
          <span className="bg-primary/10 text-primary px-4 py-2 rounded-full font-bold tracking-widest text-xs uppercase">
            FAQ
          </span>
          <h2 className="text-3xl font-bold mt-6 mb-4">Common questions</h2>
          <p className="text-on-surface-variant">
            Everything you need to know about Groupys.
          </p>
        </div>
        <div>
          {faqs.map((faq) => (
            <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </section>
  );
}
