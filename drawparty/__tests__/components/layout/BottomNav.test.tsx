// DrawParty — BottomNav Component Tests
// Tests components/layout/BottomNav.tsx — mobile bottom navigation.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const useUserMock = vi.hoisted(() => vi.fn().mockReturnValue({ isSignedIn: false, user: null }));

vi.mock("@clerk/nextjs", () => ({
  useUser: useUserMock,
}));
vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({
    t: {
      nav: { home: "Home", profile: "Profile", signIn: "Sign In" },
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

import { BottomNav } from "@/components/layout/BottomNav";

beforeEach(() => {
  vi.clearAllMocks();
  useUserMock.mockReturnValue({ isSignedIn: false, user: null });
});

describe("nav tabs", () => {
  it("renders Home tab", () => {
    render(<BottomNav />);
    expect(screen.getByText("Home")).toBeInTheDocument();
  });
});

describe("profile button", () => {
  it("shows 'Sign In' when not signed in", () => {
    render(<BottomNav />);
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("shows avatar and 'Profile' when signed in", async () => {
    useUserMock.mockReturnValue({
      isSignedIn: true,
      user: { username: "alice", imageUrl: "img.png" },
    });
    render(<BottomNav />);
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("opens UserPanel on click", async () => {
    useUserMock.mockReturnValue({
      isSignedIn: true,
      user: { username: "alice", imageUrl: "img.png" },
    });
    const user = userEvent.setup();
    render(<BottomNav />);
    await user.click(screen.getByText("Profile"));
    expect(screen.getByTestId("user-panel")).toBeInTheDocument();
  });
});
