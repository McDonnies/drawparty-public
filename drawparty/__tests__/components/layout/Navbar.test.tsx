// DrawParty — Navbar Component Tests
// Tests components/layout/Navbar.tsx — desktop top navigation.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const useUserMock = vi.hoisted(() => vi.fn().mockReturnValue({ isSignedIn: false, user: null }));

vi.mock("@clerk/nextjs", () => ({
  useUser: useUserMock,
}));
vi.mock("@/context/NotificationContext", () => ({
  useNotifications: () => ({ hasUnread: false }),
}));
vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    t: {
      nav: { getStarted: "Get Started" },
    },
  }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));
vi.mock("@/components/auth/UserPanel", () => ({
  UserPanel: ({ open, onClose }: any) => open ? <div data-testid="user-panel"><button onClick={onClose}>close</button></div> : null,
}));
vi.mock("@/components/layout/LanguageSwitcher", () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}));

import { Navbar } from "@/components/layout/Navbar";

beforeEach(() => {
  vi.clearAllMocks();
  useUserMock.mockReturnValue({ isSignedIn: false, user: null });
});

describe("unauthenticated state", () => {
  it("shows 'Get Started' button when not signed in", () => {
    render(<Navbar />);
    expect(screen.getByRole("button", { name: /get started/i })).toBeInTheDocument();
  });
});

describe("authenticated state", () => {
  it("renders avatar button when signed in", () => {
    useUserMock.mockReturnValue({
      isSignedIn: true,
      user: { username: "alice", imageUrl: "img.png" },
    });
    render(<Navbar />);
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("opens UserPanel when avatar button clicked", async () => {
    useUserMock.mockReturnValue({
      isSignedIn: true,
      user: { username: "alice", imageUrl: "img.png" },
    });
    const user = userEvent.setup();
    render(<Navbar />);
    await user.click(screen.getByText("alice"));
    expect(screen.getByTestId("user-panel")).toBeInTheDocument();
  });
});

describe("children slot", () => {
  it("renders children in the nav area", () => {
    render(<Navbar><span data-testid="child">Game HUD</span></Navbar>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });
});
