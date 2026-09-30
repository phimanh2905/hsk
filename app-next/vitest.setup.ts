import "@testing-library/jest-dom/vitest";
// jsdom thiếu API browser dùng trong app: stub tối thiểu
if (!window.matchMedia) {
  window.matchMedia = (q: string) =>
    ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList;
}
window.scrollTo = window.scrollTo ?? (() => {});
