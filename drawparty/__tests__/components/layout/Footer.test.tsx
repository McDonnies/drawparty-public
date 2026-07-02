// DrawParty — Footer Component Tests
// Tests components/layout/Footer.tsx.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

import { Footer } from "@/components/layout/Footer";

describe("footer", () => {
  it("renders copyright line with brand name and year", () => {
    render(<Footer />);
    expect(screen.getByText(/© 2026/i)).toBeInTheDocument();
    expect(screen.getByText("Draw")).toBeInTheDocument();
    expect(screen.getByText("Party")).toBeInTheDocument();
    expect(screen.getByText(/All rights reserved/i)).toBeInTheDocument();
  });

  it("renders GitHub link with correct href and new-tab attributes", () => {
    render(<Footer />);
    const link = screen.getByLabelText("GitHub");
    expect(link).toHaveAttribute("href", "https://github.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders Discord link with correct href and new-tab attributes", () => {
    render(<Footer />);
    const link = screen.getByLabelText("Discord");
    expect(link).toHaveAttribute("href", "https://discord.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
