import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";

import { PassageView } from "../passage-view";
import { READING_ARTICLES } from "@/content/reading";

const tea = READING_ARTICLES.tea;

describe("PassageView", () => {
  it("render đúng số .sent và đúng số từ", () => {
    const { container } = render(
      <PassageView article={tea} scaf="hanzi" fontSize={22} playingIndex={null} onWordClick={vi.fn()} />,
    );
    const sents = container.querySelectorAll(".sent");
    expect(sents.length).toBe(tea.sentences.length);
    const words = container.querySelectorAll(".w");
    expect(words.length).toBe(tea.sentences.reduce((n, s) => n + s.length, 0));
  });

  it("click từ → onWordClick nhận word + rect", () => {
    const onWordClick = vi.fn();
    const { container } = render(
      <PassageView article={tea} scaf="hanzi" fontSize={22} playingIndex={null} onWordClick={onWordClick} />,
    );
    const first = container.querySelector(".w") as HTMLElement;
    fireEvent.click(first);
    expect(onWordClick).toHaveBeenCalledTimes(1);
    const [word, rect] = onWordClick.mock.calls[0];
    expect(word).toEqual(tea.sentences[0][0]);
    // jsdom trả về object DOMRect-like (có thể không phải instance DOMRect thật)
    expect(typeof rect).toBe("object");
    expect(rect).toHaveProperty("top");
    expect(rect).toHaveProperty("left");
  });

  it("scaf=pinyin hiện pinyin dưới chữ Hán", () => {
    const { container } = render(
      <PassageView article={tea} scaf="pinyin" fontSize={22} playingIndex={null} onWordClick={vi.fn()} />,
    );
    expect(container.textContent).toContain(tea.sentences[0][0].p);
  });

  it("scaf=hanviet hiện dòng hv", () => {
    const { container } = render(
      <PassageView article={tea} scaf="hanviet" fontSize={22} playingIndex={null} onWordClick={vi.fn()} />,
    );
    const hv = container.querySelectorAll(".hv");
    expect(hv.length).toBe(tea.sentences.reduce((n, s) => n + s.length, 0));
    expect(container.textContent).toContain(tea.sentences[0][0].h);
  });

  it("scaf=hanzi: chỉ chữ Hán, không pinyin/hv", () => {
    const { container } = render(
      <PassageView article={tea} scaf="hanzi" fontSize={22} playingIndex={null} onWordClick={vi.fn()} />,
    );
    expect(container.querySelectorAll(".hv").length).toBe(0);
    expect(container.textContent).not.toContain(tea.sentences[0][0].p);
  });

  it("playingIndex=1 → chỉ câu thứ 2 có class playing + jade-wash", () => {
    const { container } = render(
      <PassageView article={tea} scaf="hanzi" fontSize={22} playingIndex={1} onWordClick={vi.fn()} />,
    );
    const ps = container.querySelectorAll<HTMLParagraphElement>("[data-od-id='reading-canvas'] p");
    expect(ps[1].className).toContain("playing");
    expect(ps[1].className).toContain("bg-jade-wash");
    expect(ps[0].className).not.toContain("playing");
    expect(ps[2].className).not.toContain("playing");
  });

  it("đặt font size qua CSS var --reader-size", () => {
    const { container } = render(
      <PassageView article={tea} scaf="hanzi" fontSize={30} playingIndex={null} onWordClick={vi.fn()} />,
    );
    const canvas = container.querySelector("[data-od-id='reading-canvas']") as HTMLElement;
    expect(canvas.style.getPropertyValue("--reader-size")).toBe("30px");
  });
});
