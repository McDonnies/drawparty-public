// DrawParty — GarticPhoneCard Component Tests
// Tests components/gartic-phone/GarticPhoneCard.tsx — home page game card.

import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRoom } from "@/lib/api";
import { GarticPhoneCard } from "@/components/gartic-phone/GarticPhoneCard";

let isSignedIn = true;
const push = vi.fn();
const getToken = vi.fn();

vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ getToken, isSignedIn }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/api", () => ({ createRoom: vi.fn(), joinRoom: vi.fn() }));
vi.mock("@/hooks/useSound", () => ({ useSound: () => ({ play: vi.fn() }) }));
vi.mock("@/lib/guestId", () => ({
  getGuestName: vi.fn(() => ""),
  setGuestName: vi.fn(),
}));
vi.mock("@/context/LanguageContext", async () => {
  const { getTranslations } = await vi.importActual<typeof import("@/lib/translations")>("@/lib/translations");
  return { useLanguage: () => ({ t: getTranslations("en") }) };
});

beforeEach(() => {
  vi.clearAllMocks();
  isSignedIn = true;
});

describe("card render", () => {
  it("renders card title", () => {
    render(<GarticPhoneCard />);

    expect(screen.getByText("Gartic Phone")).toBeInTheDocument();
  });

  it("renders play now CTA", () => {
    render(<GarticPhoneCard />);

    expect(screen.getByText("Play now →")).toBeInTheDocument();
  });
});

describe("dialog — play view", () => {
  it("opens dialog on card click", async () => {
    const user = userEvent.setup();
    render(<GarticPhoneCard />);

    await user.click(screen.getByText("Gartic Phone"));

    expect(screen.getByRole("button", { name: "Create Room" })).toBeInTheDocument();
  });

  it("Create Room is enabled when signed in", async () => {
    const user = userEvent.setup();
    render(<GarticPhoneCard />);

    await user.click(screen.getByText("Gartic Phone"));

    expect(screen.getByRole("button", { name: "Create Room" })).toBeEnabled();
  });

  it("shows guest name input for guests", async () => {
    const user = userEvent.setup();
    isSignedIn = false;
    render(<GarticPhoneCard />);

    await user.click(screen.getByText("Gartic Phone"));

    expect(screen.getByText("Your display name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. Picasso")).toBeInTheDocument();
  });

  it("shows error for invalid join code length", async () => {
    const user = userEvent.setup();
    render(<GarticPhoneCard />);

    await user.click(screen.getByText("Gartic Phone"));
    await user.type(screen.getByPlaceholderText("ABC123"), "ABC");
    await user.keyboard("{Enter}");

    expect(screen.getByText("Room code must be 6 characters.")).toBeInTheDocument();
  });
});

describe("createRoom action", () => {
  it("calls createRoom and navigates to lobby", async () => {
    const user = userEvent.setup();
    vi.mocked(createRoom).mockResolvedValue({ id: "room-1" } as Awaited<ReturnType<typeof createRoom>>);
    render(<GarticPhoneCard />);

    await user.click(screen.getByText("Gartic Phone"));
    await user.click(screen.getByRole("button", { name: "Create Room" }));

    expect(createRoom).toHaveBeenCalledWith(getToken, "GARTIC_PHONE");
    expect(push).toHaveBeenCalledWith("/gartic-phone/lobby/room-1");
  });

  it("shows creating state during request", async () => {
    const user = userEvent.setup();
    vi.mocked(createRoom).mockImplementation(() => new Promise(() => undefined));
    render(<GarticPhoneCard />);

    await user.click(screen.getByText("Gartic Phone"));
    await user.click(screen.getByRole("button", { name: "Create Room" }));

    expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled();
  });
});
