// Tracks the current demo user id so writes can stamp created_by / changed_by.
let actorId: string | null = null;

export function setActor(id: string | null) {
  actorId = id;
}

export function getActor(): string | null {
  return actorId;
}
