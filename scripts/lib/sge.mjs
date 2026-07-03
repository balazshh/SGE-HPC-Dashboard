export function mapSgeState(raw) {
  const state = raw.trim();

  if (["r", "t", "Rr", "Rt"].includes(state)) return "running";
  if (["qw"].includes(state)) return "queued";
  if (["hqw", "hRwq"].includes(state)) return "hold";
  if (["s", "ts", "S", "tS", "T", "tT", "Rs", "Rts", "RS", "RtS", "RT", "RtT"].includes(state)) return "suspended";
  if (["Eqw", "Ehqw", "EhRqw"].includes(state)) return "error";
  if (["dr", "dt", "dRr", "dRt", "ds", "dS", "dT", "dRs", "dRS", "dRT"].includes(state)) return "deleted";

  return "queued";
}

export function normalizeHpcUsername(email) {
  return email.split("@")[0].trim().toLowerCase();
}
