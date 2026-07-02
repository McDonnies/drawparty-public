const ID_KEY = "drawparty_guest_id";
const NAME_KEY = "drawparty_guest_name";

export function getOrCreateGuestId(): string {
  let id = localStorage.getItem(ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ID_KEY, id);
  }
  return id;
}

export function getGuestName(): string | null {
  return localStorage.getItem(NAME_KEY);
}

export function setGuestName(name: string): void {
  localStorage.setItem(NAME_KEY, name.trim().slice(0, 20));
}
