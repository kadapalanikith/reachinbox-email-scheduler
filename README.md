# ReachInbox — Distributed Email Scheduler & Outreach Platform

A production-grade, distributed cold-email scheduling and dispatch service engineered for high-throughput resilience. Backed by **BullMQ**, **Redis**, **PostgreSQL**, **Elasticsearch**, and **Ethereal SMTP**, featuring distributed hourly rate limiting, minimum-delay send throttling, real **Slack OAuth** alerting, real **Google OAuth**, and real-time **Bull Board** telemetry.

---

## 📌 Architecture Diagram

```
                                  +------------------------------------------+
                                  |         React 18 + Vite + Tailwind       |
                                  |   (SaaS Dashboard, Live Search, CSV UI)  |
                                  +--------------------+---------------------+
                                                       | HTTP / httpOnly Cookies
                                                       v
                                  +--------------------+---------------------+
                                  |       Express.js Backend (Node + TS)     |
                                  |  - Google OAuth / Session Middleware     |
                                  |  - Slack OAuth & WebClient Notifications |
                                  |  - Campaign & Staggered Scheduling API   |
                                  |  - Elasticsearch Scoped Full-Text Search |
                                  |  - Bull Board Monitoring (/admin/queues) |
                                  +-------+--------------------+-------------+
                                          |                    |
                             Prisma ORM   |                    | BullMQ Producer
                                          v                    v
                          +---------------+------+      +------+--------------+
                          |    PostgreSQL DB     |      |       Redis 7       |
                          | - Users & Senders    |      | - BullMQ Queue Jobs |
                          | - Campaigns & Emails |      | - Hourly Windows    |
                          | - Slack Connections  |      | - Min-delay Gating  |
                          | - Idempotency Keys   |      | - Alert Dedupe Keys |
                          +----------------------+      +------+--------------+
                                                               |
                                                               | BullMQ Consumer (Delayed Jobs)
                                                               v
                                  +----------------------------+-------------+
                                  |               BullMQ Worker              |
                                  |  - Configurable Concurrency (env)        |
                                  |  - Distributed Lock & DB Status Check    |
                                  |  - Atomic Lua Hourly Rate Limiting       |
                                  |  - Atomic Minimum Send Delay Throttling  |
                                  |  - Staggered Rescheduling to Next Window |
                                  |  - Slack Notification Rate-Limit Alert   |
                                  |  - Nodemailer Ethereal SMTP Dispatch     |
                                  |  - Elasticsearch Document Auto-Sync      |
                                  +-------------+----------------------------+
                                                |
                                +---------------+---------------+
                                |                               |
                                v                               v
                     +----------+-----------+       +-----------+----------+
                     |  Ethereal SMTP / Web |       |  Elasticsearch 8.x   |
                     |  (Real Test Emails)  |       |  (Full-text Search)  |
                     +----------------------+       +----------------------+
```

---

## 🎨 UI/UX Note

> [!NOTE]
> The ReachInbox assignment references a Figma design that was not accessible to us. The frontend was therefore designed using the **UI UX Pro Max** design methodology (`ui-ux-pro-max-skill`), preserving all functional, table, badge, and modal requirements while delivering a polished, modern, accessible B2B SaaS outreach interface.

---

## 🛠️ Tech Stack

- **Backend**: Node.js 20+, Express.js, TypeScript
- **Database & ORM**: PostgreSQL 15+, Prisma ORM
- **Queue & Distributed State**: Redis 7+, BullMQ (Persistent Delayed Jobs)
- **Monitoring**: Bull Board (`@bull-board/express`)
- **Search Engine**: Elasticsearch 8.x
- **Email Delivery**: Nodemailer + Ethereal SMTP
- **Integrations**: Google OAuth 2.0 (`google-auth-library`), Slack API (`@slack/web-api`)
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Axios
- **Testing**: Vitest, V8 coverage

---

## 🚀 Quick Start & Setup

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) & Docker Compose

### 2. Start Infrastructure
Launch PostgreSQL, Redis, and Elasticsearch with a single command:
```bash
docker compose up -d
```
Verify all containers are healthy:
```bash
docker compose ps
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Review the [Environment Variables](#-environment-variables) section below).*

### 4. Database Setup
Generate Prisma client and run migrations:
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 5. Run the Application
Open two terminal windows (or run via workspaces):

**Terminal 1 — Backend & BullMQ Worker:**
```bash
npm run dev:backend
```
*(The backend starts on `http://localhost:5000` and automatically runs the BullMQ worker. If you want to run the worker in a standalone process, set `START_WORKER=false` and run `npm run worker`).*

**Terminal 2 — Frontend Application:**
```bash
npm run dev:frontend
```
Open `http://localhost:5173` in your browser.

---

## 🔑 Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Backend HTTP port | `5000` |
| `CLIENT_URL` | Frontend origin for CORS and OAuth redirects | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://reachinbox:reachinbox_secret_password@localhost:5432/reachinbox_scheduler` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `ELASTICSEARCH_URL` | Elasticsearch HTTP endpoint | `http://localhost:9200` |
| `JWT_SECRET` | Secret key for signing session JWTs | *(min 32 characters)* |
| `MAX_EMAILS_PER_HOUR`| Maximum emails a sender can dispatch per clock hour | `100` |
| `EMAIL_MIN_DELAY_MS` | Minimum throttle delay between individual sends | `2000` |
| `WORKER_CONCURRENCY` | Number of parallel jobs a worker processes | `10` |
| `ETHEREAL_USER` | Ethereal SMTP username *(auto-generated if empty)*| *(empty)* |
| `ETHEREAL_PASSWORD` | Ethereal SMTP password *(auto-generated if empty)*| *(empty)* |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | *(from Google Cloud Console)* |
| `GOOGLE_CLIENT_SECRET`| Google OAuth Client Secret | *(from Google Cloud Console)* |
| `GOOGLE_CALLBACK_URL`| Google OAuth Callback URL | `http://localhost:5000/api/auth/google/callback` |
| `SLACK_CLIENT_ID` | Slack App Client ID | *(from api.slack.com)* |
| `SLACK_CLIENT_SECRET`| Slack App Client Secret | *(from api.slack.com)* |
| `SLACK_REDIRECT_URI` | Slack OAuth Redirect URI | `http://localhost:5000/api/slack/callback` |

---

## ⚙️ Core Architecture & Requirements Breakdown

### 1. Email Scheduling & Restart Persistence
- **No Cron**: Neither OS crontab nor `node-cron`/`agenda` are used. All scheduling is managed through **BullMQ delayed jobs**.
- **Individual Delayed Jobs**: When a campaign of $N$ emails is scheduled starting at $T$ with delay $D$, email $i$ is calculated as:
  $$\text{scheduledAt} = T + (i \times D)$$
  Each email is assigned its own independent BullMQ delayed job (`delay = scheduledAt - now`), stored with its BullMQ job ID in PostgreSQL.
- **Persistence Across Restarts**: When the backend or worker restarts, BullMQ reads pending delayed jobs directly from Redis sorted sets (`bull:email-dispatch-queue:delayed`). Jobs are never lost, and they dispatch precisely at their scheduled timestamps without needing to reload or duplicate state from PostgreSQL.

### 2. Distributed Hourly Rate Limiting & Staggered Rescheduling
- **Redis Calendar Windows**: Uses calendar hour windows formatted as `rate:{senderId}:{YYYY-MM-DD-HH}` (e.g. `rate:sender123:2026-09-29-17`).
- **Atomic Lua Evaluation**: An atomic Redis Lua script checks current count against `MAX_EMAILS_PER_HOUR`. If under limit, it increments atomically and sets a 2-hour TTL.
- **Graceful Rescheduling (Zero Drops)**: If the limit is reached:
  1. The email is **not** dropped or failed.
  2. The next calendar hour window is computed (`YYYY-MM-DD-(HH+1)`).
  3. Staggered offset is computed: `staggerOffset = (overflowIndex - 1) * delayMs`.
  4. The job is rescheduled in BullMQ with delay to `nextHourStart + staggerOffset`.
  5. `scheduledAt` is updated in PostgreSQL to preserve ordering and accurate UI reporting.

### 3. Distributed Minimum Send Delay
- **Provider Throttling Protection**: Configured via `EMAIL_MIN_DELAY_MS=2000`.
- **Atomic Redis Timestamp Gating**: The worker queries `last_sent_at:{senderId}`. If `now - lastSent < EMAIL_MIN_DELAY_MS`, the worker waits the remaining milliseconds before sending, then atomically records the new timestamp. This coordinates smoothly across multiple concurrent worker threads.

### 4. Real Idempotency & Concurrency Safety
- **PostgreSQL Unique Constraint**: `idempotencyKey` has a strict `@unique` constraint in PostgreSQL (`sha256(campaignId:recipient:index)`).
- **Worker Check**: Before dispatching, the worker verifies `if (email.status === 'SENT') return`. An already-sent email can never be sent a second time.
- **Redis Distributed Locking**: A distributed lock `lock:email:{emailId}` with a 45-second TTL prevents concurrent workers from processing duplicate jobs simultaneously.

### 5. Real Slack OAuth & Hourly Alert Deduplication
- **OAuth Flow**: Users click "Connect Slack" in the dashboard header, authenticating with their workspace via `chat:write` and `incoming-webhook` scopes. Access tokens and channel details are securely persisted in PostgreSQL.
- **Hourly Deduplication**: When a rate limit is breached, an atomic Redis `SET ... NX` operation sets `rate_alert_sent:{senderId}:{hourWindow}` with a 1-hour TTL. Exactly **one** Slack Block Kit notification is dispatched per hour window per sender, preventing alert spam.
- **Resilience**: If Slack is not connected, the rate limit is enforced normally without errors. If connected later, future alerts trigger automatically without redeployment.

### 6. Real Google OAuth + Reviewer Quick Login
- **Google OAuth 2.0**: Official `google-auth-library` implementation. Redirects to Google consent screen, verifies ID tokens, creates user profile, and sets an `httpOnly`, `SameSite` JWT cookie.
- **Reviewer / Evaluator Quick Access**: A dedicated button is provided on the login page specifically for evaluators who wish to inspect the complete system without setting up Google Cloud Console OAuth credentials.

### 7. Elasticsearch Full-Text Search
- **Document Indexing**: Every scheduled and sent email is indexed into Elasticsearch under index `emails`.
- **Scoped Multi-Match Search**: `GET /api/emails/search?q=...` executes a boolean query with `multi_match` across `subject`, `body`, and `recipient`, strictly filtered by `userId`.
- **Resilient Fallback**: If Elasticsearch is initializing or offline, the search endpoint seamlessly falls back to PostgreSQL relational queries so the user interface never breaks.

### 8. Bull Board Queue Telemetry
- Embedded at `/admin/queues` with real-time counters for **waiting**, **delayed**, **active**, **completed**, and **failed** jobs. Accessible directly from the dashboard header.

---

## 🧪 Automated Testing

Run the test suite with Vitest:
```bash
npm run test
```

### Test Coverage Highlights:
- `csvParser.test.ts`: Header formats (`email`, `name,email`), duplicate deduplication, invalid emails, empty input.
- `rateLimiter.test.ts`: UTC hour window formatting, next hour calculation, atomic Lua script responses, staggered overflow delay math.
- `scheduler.test.ts`: Campaign creation, individual delayed job generation with formula `startTime + index * delayMs`.
- `idempotency.test.ts`: Verifies an already-`SENT` email is skipped and cannot re-trigger SMTP; verifies Redis lock contention handling.
- `persistence.test.ts`: Verifies delayed jobs survive worker shutdowns and resume smoothly upon restart.
- `api.test.ts`: JWT signature verification and CSV endpoint validation.

---

## 🎬 5-Minute Recommended Demo Script

1. **Sign In**: Navigate to `http://localhost:5173`. Click **Reviewer / Evaluator Quick Access** (or **Continue with Google**).
2. **Dashboard Overview**: Note the top header with user profile, Bull Board "Queue Monitor" link, and "Connect Slack" button.
3. **Compose Email**: Click **Compose New Email**:
   - Choose Sender.
   - Enter Subject: *"Accelerating Cold Outreach"*.
   - Enter Body: *"Hi {{name}}, loved your recent product launch..."*.
   - Click **Upload File** and select a test CSV (e.g. `john@example.com, jane@example.com`).
   - Notice the instant badge: `2 valid email addresses detected`.
   - Set Delay to `2000` ms and click **Schedule Campaign**.
4. **Queue Monitor**: Open `/admin/queues` in a new tab. Watch the jobs enter `delayed`, transition to `active`, and complete.
5. **Sent Emails & Ethereal**: Switch to the **Sent Emails** tab. Click the **View Email** button to open the actual rendered Ethereal message preview in your browser!
6. **Search**: Type a recipient name or subject in the search bar. Observe instant Elasticsearch multi-match results.
7. **Simulate Worker Restart**:
   - Schedule 5 emails delayed by 30 seconds.
   - Stop the backend/worker in terminal (`Ctrl+C`).
   - Redis remains running; wait 10 seconds.
   - Restart the backend/worker (`npm run dev:backend`).
   - Observe BullMQ recover the jobs from Redis and dispatch them at the exact intended time.

---

## ⚖️ Assumptions & Trade-offs

1. **Calendar Hour vs. Sliding Window**: We implemented fixed calendar hour windows (`YYYY-MM-DD-HH` UTC) matching the assignment's explicit key schema (`rate:{senderId}:{hourWindow}`). Staggered delays ensure traffic does not spike at the hour boundary.
2. **Ethereal Mailbox**: When no static credentials are provided in `.env`, Nodemailer dynamically provisions a real Ethereal account on startup and logs the login details to stdout.
3. **Dual Login Flow**: Real Google OAuth is primary; the demo button exists solely to facilitate frictionless evaluator testing.

---

## ☁️ Production Deployment (AWS EC2 + GitHub Pages)

The production architecture is fully containerized and decoupled:
- **Frontend**: Deployed to **GitHub Pages** with GitHub Actions CI/CD (`.github/workflows/deploy-frontend.yml`).
- **Backend API & Queue Worker**: Run as independent services in `docker-compose.prod.yml` on **AWS EC2 (Ubuntu 24.04 LTS)**.
- **Database & Queue**: PostgreSQL 15, Redis 7 (AOF persistence), and Elasticsearch 8.11 run inside isolated Docker networks with named persistent volumes.
- **Reverse Proxy**: Nginx with Let's Encrypt automated TLS certificates.

For complete, step-by-step AWS provisioning, budget alert setup, SSL certificate issuance, and domain configuration, refer to the [DEPLOYMENT_GUIDE.md](file:///d:/reachinbox-email-scheduler/DEPLOYMENT_GUIDE.md).

### Quick Production Deployment Commands:
```bash
# 1. On your EC2 instance:
git clone https://github.com/kadapalanikith/reachinbox-email-scheduler.git
cd reachinbox-email-scheduler
cp .env.production.example .env
nano .env

# 2. Run the deployment script:
chmod +x deploy.sh
./deploy.sh
```

---

## 📡 API Endpoints Reference

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | Backend, Redis, and Elasticsearch status |
| `GET` | `/admin/queues` | Admin | Bull Board real-time queue monitor |
| `GET` | `/api/auth/google` | Public | Initiates Google OAuth 2.0 flow |
| `GET` | `/api/auth/google/callback` | Public | Handles Google OAuth redirect & sets JWT cookie |
| `POST`| `/api/auth/demo-login` | Public | Evaluator 1-click test login |
| `GET` | `/api/auth/me` | JWT | Returns current authenticated user |
| `POST`| `/api/auth/logout` | Public | Clears session cookie |
| `POST`| `/api/emails/schedule` | JWT | Schedules batch campaigns with staggered delays |
| `POST`| `/api/emails/parse-csv` | JWT | Parses CSV file or raw text recipient lists |
| `GET` | `/api/emails/scheduled` | JWT | Fetches scheduled & processing emails |
| `GET` | `/api/emails/sent` | JWT | Fetches sent & failed email history |
| `GET` | `/api/emails/search?q=...` | JWT | Scoped Elasticsearch full-text search |
| `GET` | `/api/emails/senders` | JWT | Lists available sender profiles |
| `POST`| `/api/emails/senders` | JWT | Creates a new sender profile |
| `GET` | `/api/slack/connect` | JWT | Initiates Slack OAuth connection |
| `GET` | `/api/slack/callback` | Public | Slack OAuth callback & token storage |
| `GET` | `/api/slack/status` | JWT | Checks Slack workspace connection status |
| `POST`| `/api/slack/disconnect` | JWT | Unlinks Slack workspace |
| `POST`| `/api/slack/test` | JWT | Triggers a test rate-limit alert to Slack |

