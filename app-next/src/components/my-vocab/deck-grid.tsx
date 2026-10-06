"use client";

/* Deck grid — port .decks/.deck của mock: icon/name/meta/mastery bar/"Học Flashcard"/⋯ menu. */
import { Briefcase, Folder, Inbox, Star } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

export type DeckCard = {
  id: string;
  name: string;
  meta: string;
  mastery: number;
  icon: "inbox" | "star" | "brief" | "folder";
};

const ICONS = {
  inbox: <Inbox size={18} strokeWidth={1.5} aria-hidden="true" />,
  star: <Star size={18} aria-hidden="true" />,
  brief: <Briefcase size={18} strokeWidth={1.5} aria-hidden="true" />,
  folder: <Folder size={18} strokeWidth={1.5} aria-hidden="true" />,
} as const;

export function DeckGrid({
  decks, onStudy, onMenu,
}: {
  decks: DeckCard[];
  onStudy: (id: string) => void;
  onMenu: (id: string) => void;
}) {
  return (
    <section data-od-id="deck-grid" aria-label="Bộ thẻ" className="grid grid-cols-1 gap-3 min-[861px]:grid-cols-3">
      {decks.map((d) => (
        <article
          key={d.id}
          data-od-id={`deck-${d.id}`}
          className="relative rounded-card border border-border-subtle bg-surface-elevated/80 p-[18px] shadow-xs backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <button
            type="button"
            aria-label="Thao tác deck"
            onClick={() => onMenu(d.id)}
            className="absolute right-3 top-3 grid h-[34px] w-[34px] place-items-center rounded-[9px] text-[17px] tracking-widest text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary"
          >
            ⋯
          </button>
          <div className="mb-2.5 grid h-10 w-10 place-items-center rounded-xl border border-border-subtle bg-surface-muted text-text-secondary">
            {ICONS[d.icon]}
          </div>
          <h3 className="text-[14.5px] font-bold text-text-primary">{d.name}</h3>
          <p className="mb-2 mt-1 text-[12.5px] text-text-secondary">{d.meta}</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-border-subtle">
            <i className="block h-full rounded-full bg-learning-mastered" style={{ width: `${d.mastery}%` }} />
          </div>
          <p className="mt-1.5 text-[11.5px] font-bold text-text-secondary">Độ bền: {d.mastery}%</p>
          <button
            type="button"
            onClick={() => onStudy(d.id)}
            className={cn(
              "mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface-muted px-[18px]",
              "text-[13px] font-semibold text-text-primary transition-all hover:-translate-y-px hover:border-border-strong hover:bg-surface-elevated active:scale-[0.98]",
            )}
          >
            Học Flashcard
          </button>
        </article>
      ))}
    </section>
  );
}
