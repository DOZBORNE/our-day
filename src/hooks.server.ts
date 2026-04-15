import type { Handle } from "@sveltejs/kit";

const COOKIE_NAME = "wp-access";

// Hardcoded users. To add/change a user, edit this list and restart the server.
// id  → stable key written into the database (NEVER change once you have data).
// pin → what the user types at the gate (safe to rotate).
// name → display label shown in the UI.
export const USERS = [
  { id: "devin&jess", pin: "062025", name: "Devin & Jess" },
  { id: "morgan&caleb", pin: "103025", name: "Morgan & Caleb" },
] as const;

export type AppUser = (typeof USERS)[number];

function findUserById(id: string): AppUser | undefined {
  return USERS.find((u) => u.id === id);
}

export const handle: Handle = async ({ event, resolve }) => {
  // Allow the login page through unauthenticated
  if (event.url.pathname === "/login") {
    return resolve(event);
  }

  const cookie = event.cookies.get(COOKIE_NAME);
  let user: AppUser | undefined;
  if (cookie) {
    try {
      user = findUserById(atob(cookie));
    } catch {
      user = undefined;
    }
  }

  if (!user) {
    return new Response(null, {
      status: 302,
      headers: { location: "/login" },
    });
  }

  event.locals.userId = user.id;
  event.locals.userName = user.name;
  return resolve(event);
};
