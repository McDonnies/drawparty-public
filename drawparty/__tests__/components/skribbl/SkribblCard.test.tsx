// DrawParty — SkribblCard Component Tests
// Tests components/skribbl/SkribblCard.tsx — home page game card for Skribbl.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getTranslations } from "@/lib/translations";
const en = getTranslations("en");

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: vi.fn(), isSignedIn: true }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));
vi.mock("@/lib/api", () => ({
  createRoom: vi.fn().mockResolvedValue({ id: "room-1", code: "ABC123" }),
  joinRoom: vi.fn().mockResolvedValue({ id: "room-2", code: "XYZ789" }),
}));
vi.mock("@/hooks/useSound", () => ({
  useSound: () => ({ play: vi.fn() }),
}));
vi.mock("@/lib/guestId", () => ({
  getGuestName: vi.fn().mockReturnValue(""),
  setGuestName: vi.fn(),
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));
vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({ t: en }),
}));

import { SkribblCard } from "@/components/skribbl/SkribblCard";

beforeEach(() => vi.clearAllMocks());

describe("card render", () => {
  it("renders 'Skribbl.io' title", () => {
    render(<SkribblCard />);
    expect(screen.getByText("Skribbl.io")).toBeInTheDocument();
  });

  it("opens dialog when card is clicked", async () => {
    const user = userEvent.setup();
    render(<SkribblCard />);
    await user.click(screen.getByText("Skribbl.io"));
    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.getByText(en.skribbl.createRoom)).toBeInTheDocument();
  });
});

describe("dialog", () => {
  it("renders Create Room button in dialog", async () => {
    const user = userEvent.setup();
    render(<SkribblCard />);
    await user.click(screen.getByText("Skribbl.io"));
    const btn = screen.getByText(en.skribbl.createRoom).closest("button");
    expect(btn).toBeEnabled();
  });

  it("renders join code input in dialog", async () => {
    const user = userEvent.setup();
    render(<SkribblCard />);
    await user.click(screen.getByText("Skribbl.io"));
    expect(screen.getByPlaceholderText("ABC123")).toBeInTheDocument();
  });
});
