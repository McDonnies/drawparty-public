// DrawParty — UserPanel Component Tests
// Tests components/auth/UserPanel.tsx — social sidebar (friends, notifications, profile).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { getTranslations } from "@/lib/translations";
const en = getTranslations("en");

const useUserMock = vi.hoisted(() => vi.fn().mockReturnValue({ user: { username: "alice", imageUrl: "img.png" }, isSignedIn: true }));
const signOutMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs", () => ({
  useUser: useUserMock,
  useClerk: () => ({ signOut: signOutMock }),
}));
vi.mock("@/hooks/useFriends", () => ({
  useFriends: () => ({
    friends: [],
    pendingRequests: [],
    isLoading: false,
    sendFriendRequest: vi.fn(),
    acceptRequest: vi.fn(),
    declineRequest: vi.fn(),
    removeFriend: vi.fn(),
    searchUsers: vi.fn().mockResolvedValue([]),
  }),
}));
vi.mock("@/context/NotificationContext", () => ({
  useNotifications: () => ({
    notifications: [],
    hasUnread: false,
    markAllRead: vi.fn(),
    dismiss: vi.fn(),
    addNotification: vi.fn(),
    removeNotification: vi.fn(),
  }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));
vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));
vi.mock("@/lib/socket", () => ({
  socket: { emit: vi.fn() },
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children }: any) => <button>{children}</button>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));
// Use real translations via lazy reference
vi.mock("@/context/LanguageContext", () => ({
  useLanguage: () => ({ t: en }),
}));

import { UserPanel } from "@/components/auth/UserPanel";

beforeEach(() => {
  vi.clearAllMocks();
  useUserMock.mockReturnValue({ user: { username: "alice", imageUrl: "img.png" }, isSignedIn: true });
});

describe("panel open/close", () => {
  it("renders panel when open=true and user is signed in", () => {
    render(<UserPanel open={true} onClose={vi.fn()} />);
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("returns nothing when user is not signed in", () => {
    useUserMock.mockReturnValue({ user: null, isSignedIn: false });
    const { container } = render(<UserPanel open={true} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders logout button", () => {
    render(<UserPanel open={true} onClose={vi.fn()} />);
    expect(screen.getByText(en.social.logOut)).toBeInTheDocument();
  });
});

describe("tabs", () => {
  it("shows empty friends state by default", () => {
    render(<UserPanel open={true} onClose={vi.fn()} />);
    expect(screen.getByText(en.social.noFriendsYet)).toBeInTheDocument();
  });
});
