/**
 * Clash of Codes — API Client
 * Interfaces with FastAPI endpoints at /api.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  // Attach mock dev token if no Authorization header provided
  if (!headers.Authorization && typeof window !== "undefined") {
    const token = localStorage.getItem("coc_auth_token") || "dev_warrior_01";
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = "API request failed";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Auth
  getMe: () => request("/auth/me"),
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),

  // Users
  getUser: (uid) => request(`/users/${uid}`),
  updateMe: (payload) => request("/users/me", { method: "PATCH", body: JSON.stringify(payload) }),

  // Clans
  listClans: () => request("/clans"),
  getClan: (clanId) => request(`/clans/${clanId}`),
  createClan: (payload) => request("/clans", { method: "POST", body: JSON.stringify(payload) }),
  joinClan: (clanId) => request(`/clans/${clanId}/join`, { method: "POST" }),
  leaveClan: (clanId) => request(`/clans/${clanId}/leave`, { method: "POST" }),
  generateInviteLink: (clanId) => request(`/clans/${clanId}/invite-link`, { method: "POST" }),
  joinViaInvite: (code) => request(`/clans/join?code=${code}`),

  // Wars
  searchWar: (warSize = 5) => request("/wars/search", { method: "POST", body: JSON.stringify({ war_size: warSize }) }),
  cancelWarSearch: () => request("/wars/cancel-search", { method: "POST" }),
  getWar: (warId) => request(`/wars/${warId}`),
  getActiveWar: (clanId) => request(`/wars/active/${clanId}`),
  getWarHistory: () => request("/wars/history"),
  resetDemoWar: (warId = "demo_war") => request(`/wars/${warId}/reset-demo`, { method: "POST" }),
  synthesizeTraps: (warId, slotPosition = 1) =>
    request(`/wars/${warId}/auto-traps?slot_position=${slotPosition}`, { method: "POST" }),
  tagTarget: (warId, payload) =>
    request(`/wars/${warId}/tag-target`, { method: "POST", body: JSON.stringify(payload) }),
  createTournament: (clans, name = "Grand Championship") =>
    request("/wars/tournaments/create", { method: "POST", body: JSON.stringify(clans) }),

  // Users & Analytics
  getUserEloHistory: (uid) => request(`/users/${uid}/elo-history`),


  // Problems
  listProblems: (difficulty = null) =>
    request(`/problems${difficulty ? `?difficulty=${difficulty}` : ""}`),
  getProblem: (problemId) => request(`/problems/${problemId}`),

  // Submissions
  submitCode: (payload) =>
    request("/submissions", { method: "POST", body: JSON.stringify(payload) }),
  customRun: (payload) =>
    request("/submissions/custom-run", { method: "POST", body: JSON.stringify(payload) }),
  profileCode: (payload) =>
    request("/submissions/profile", { method: "POST", body: JSON.stringify(payload) }),
  getSubmission: (submissionId) => request(`/submissions/${submissionId}`),

  // Defense Traps (Preparation Day)
  addDefenseTrap: (warId, payload) =>
    request(`/wars/${warId}/defense-traps`, { method: "POST", body: JSON.stringify(payload) }),

  // Clan Castle Tactical Spells
  castSpell: (warId, payload) =>
    request(`/wars/${warId}/spells`, { method: "POST", body: JSON.stringify(payload) }),

  // Leaderboard
  getUserLeaderboard: () => request("/leaderboard/users"),
  getClanLeaderboard: () => request("/leaderboard/clans"),
};

