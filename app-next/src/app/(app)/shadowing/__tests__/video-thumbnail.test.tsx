import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VideoThumbnail } from "../video-thumbnail";
import type { ShadowingVideo } from "@/content/shadowing";

const ytVideo = {
  id: "EA3rwvr99Q0",
  title: "视频标题",
  type: "youtube",
} as ShadowingVideo;

const audioVideo = { ...ytVideo, id: "demo-audio", type: "audio" } as ShadowingVideo;

describe("VideoThumbnail", () => {
  it("youtube: render img i.ytimg.com hqdefault, lazy, alt rỗng", () => {
    const { container } = render(<VideoThumbnail video={ytVideo} />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", "https://i.ytimg.com/vi/EA3rwvr99Q0/hqdefault.jpg");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("alt", "");
  });

  it("audio: không render img, giữ fallback gradient + 2 chữ đầu title", () => {
    const { container } = render(<VideoThumbnail video={audioVideo} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".hz-thumb-gradient")).not.toBeNull();
    expect(container.textContent).toContain("视频");
  });

  it("youtube: img onError → ẩn img, fallback hiện", () => {
    const { container } = render(<VideoThumbnail video={ytVideo} />);
    const img = container.querySelector("img")!;
    fireEvent.error(img);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".hz-thumb-gradient")).not.toBeNull();
  });

  it("big: chữ placeholder là text-8xl, mặc định text-5xl", () => {
    const { container, rerender } = render(<VideoThumbnail video={audioVideo} />);
    expect(container.querySelector(".text-5xl")).not.toBeNull();
    rerender(<VideoThumbnail video={audioVideo} big />);
    expect(container.querySelector(".text-8xl")).not.toBeNull();
  });
});
