/**
 * Scenario 05: Community & Leaderboard
 * Tests: browse posts → post detail with comments → leaderboard rankings
 * VUs: ramps to 500 (read-heavy, surfaces N+1 / missing-index issues)
 *
 * NOTE: Comments (replies) are embedded in the GET /community/posts/:id response.
 * There is no standalone GET /replies endpoint. POST /posts/:id/replies is
 * write-only and not exercised here (covered by trade journal write tests).
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";
import { BASE_URL, DEFAULT_HEADERS } from "../utils/config.js";
import { registerAndLogin } from "../utils/auth.js";

const postsDuration = new Trend("community_posts_duration", true);
const postDetailDuration = new Trend("community_post_detail_duration", true);
const leaderboardDuration = new Trend("community_leaderboard_duration", true);
const communityErrors = new Counter("community_errors");
const communityServerErrors = new Counter("community_server_errors");
const communityIterations = new Counter("community_iterations");

const CATEGORIES = ["general", "trade-reviews", "psychology", "strategy", "news"];
const SMOKE = __ENV.SMOKE_TEST === "true";

export const options = {
  scenarios: {
    community_read: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: SMOKE
        ? [{ duration: "15s", target: 5 }, { duration: "15s", target: 0 }]
        : [
            { duration: "2m", target: 500 },
            { duration: "5m", target: 500 },
            { duration: "30s", target: 0 },
          ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<2000", "p(99)<4000"],
    community_posts_duration: ["p(95)<2000"],
    community_post_detail_duration: ["p(95)<2000"],
    community_leaderboard_duration: ["p(95)<2000"],
    community_errors: ["count<1"],
    community_server_errors: ["count<1"],
    community_iterations: ["count>0"],
    checks: ["rate>0.90"],
  },
};

let token = null;

export default function () {
  if (!token) {
    const creds = registerAndLogin();
    token = creds.token;
    if (!token) {
      communityErrors.add(1);
      return;
    }
  }

  const authHeader = {
    ...DEFAULT_HEADERS,
    Authorization: `Bearer ${token}`,
  };

  communityIterations.add(1);

  // 1. Browse posts list (paginated, by category)
  const page = Math.floor(Math.random() * 3) + 1;
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

  const postsStart = Date.now();
  const postsRes = http.get(
    `${BASE_URL}/community/posts?page=${page}&limit=20&category=${category}`,
    { headers: authHeader }
  );
  postsDuration.add(Date.now() - postsStart);

  const postsOk = check(postsRes, {
    "community/posts: status 200 or 429 (rate limit)": (r) =>
      r.status === 200 || r.status === 429,
    "community/posts: has posts array when 200": (r) => {
      if (r.status !== 200) return true;
      try { return Array.isArray(r.json("posts")); } catch { return false; }
    },
  });

  if (!postsOk) {
    communityErrors.add(1);
  }

  sleep(0.3);

  // 2. View post detail — GET /posts/:id returns post + embedded comments (replies)
  let firstPostId = null;
  if (postsRes.status === 200) {
    try {
      const posts = postsRes.json("posts");
      if (posts && posts.length > 0) {
        firstPostId = posts[Math.floor(Math.random() * posts.length)].id;
      }
    } catch {}
  }

  if (firstPostId) {
    const detailStart = Date.now();
    const detailRes = http.get(
      `${BASE_URL}/community/posts/${firstPostId}`,
      { headers: authHeader }
    );
    postDetailDuration.add(Date.now() - detailStart);

    check(detailRes, {
      "community/post detail: status 200 or 429": (r) =>
        r.status === 200 || r.status === 429,
      "community/post detail: has replies when 200": (r) => {
        if (r.status !== 200) return true;
        try {
          const body = r.json();
          return Array.isArray(body.replies) || body.replyCount !== undefined;
        } catch { return false; }
      },
    });

    if (detailRes.status >= 500) {
      communityServerErrors.add(1);
    }
  }

  sleep(0.3);

  // 3. Leaderboard rankings
  const lbStart = Date.now();
  const lbRes = http.get(`${BASE_URL}/leaderboard`, { headers: authHeader });
  leaderboardDuration.add(Date.now() - lbStart);

  check(lbRes, {
    "leaderboard: status 200, 403, or 429": (r) =>
      r.status === 200 || r.status === 403 || r.status === 429,
    "leaderboard: not 500": (r) => r.status !== 500,
  });

  if (lbRes.status >= 500) {
    communityServerErrors.add(1);
  }

  sleep(0.5);
}
