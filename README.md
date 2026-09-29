# ReachInbox — Distributed Email Scheduler & Outreach Platform

A production-grade, distributed cold-email scheduling and outreach service engineered for high-throughput resilience, rate limiting, and zero-drop persistence. Built with **Node.js/Express**, **TypeScript**, **React**, **BullMQ**, **Redis**, **PostgreSQL**, **Elasticsearch**, and **Ethereal SMTP**, featuring atomic hourly rate limiting, minimum-delay send throttling, real-time **Slack OAuth** rate-limit notifications, **Google OAuth**, secure **Email/Password authentication**, and **Bull Board** queue telemetry.

---

## 🌐 Live Production Links

| Service | Environment / Host | URL |
| :--- | :--- | :--- |
| **Frontend Application** | GitHub Pages (SPA) | [https://kadapalanikith.github.io/reachinbox-email-scheduler/](https://kadapalanikith.github.io/reachinbox-email-scheduler/) |
| **Backend API** | AWS EC2 (Docker + Nginx TLS) | [https://api.nikith.app](https://api.nikith.app) |
| **Health Check** | AWS EC2 Endpoint | [https://api.nikith.app/health](https://api.nikith.app/health) |
| **Bull Board Telemetry** | Embedded Queue Monitor | [https://api.nikith.app/admin/queues](https://api.nikith.app/admin/queues) |

---

## 📋 Features Checklist

- [x] **Email Scheduling**: Batch and individual email dispatch staggered across configurable intervals.
- [x] **BullMQ Delayed Jobs**: Pure Redis sorted-set delayed queue mechanism (**no cron jobs**).
- [x] **Redis State Engine**: High-performance delayed queues, distributed locks, and atomic rate counters.
- [x] **PostgreSQL Persistence**: Full relational schema managed with Prisma ORM (Users, Senders, Campaigns, Emails, Slack Connections).
- [x] **Express + TypeScript Backend**: Modular controller-service architecture with strict types and centralized error handling.
- [x] **Ethereal SMTP Delivery**: Real email transport with rendered web preview links for instant verification.
- [x] **Multiple Senders Support**: Flexible sender profiles with automatic default sender assignment per user.
- [x] **Worker Concurrency**: Configurable parallel job processing (`WORKER_CONCURRENCY`, default `10`).
- [x] **Minimum Delay Throttling**: Configurable throttle delay between individual sends (`EMAIL_MIN_DELAY_MS`, default `2000` ms).
- [x] **Configurable Hourly Rate Limiting**: Per-sender limit (`MAX_EMAILS_PER_HOUR`, default `100`).
- [x] **Per-Sender Rate Limiting**: Isolated calendar-hour window tracking (`rate:{senderId}:{YYYY-MM-DD-HH}`).
- [x] **Redis-Backed Rate Limiting**: Atomic Lua script for check-and-increment operations under concurrency.
- [x] **Job Persistence**: Redis AOF persistence guarantees pending jobs survive restarts.
- [x] **Restart Recovery**: Automatically resumes delayed queues without re-querying or re-creating jobs from the database.
- [x] **Idempotency & Duplicate Prevention**: SHA-256 idempotency keys, DB status guards, and Redis distributed locks.
- [x] **Elasticsearch Indexing & Search**: Full-text multi-match search with seamless PostgreSQL relational fallback.
- [x] **Bull Board Dashboard**: Real-time queue metrics (waiting, active, delayed, completed, failed) at `/admin/queues`.
- [x] **Slack OAuth & Rate-Limit Alerts**: Automated Block Kit notifications with 1-hour deduplication when limits are breached.
- [x] **Google OAuth 2.0**: Official Google authentication flow with JWT session management.
- [x] **Email & Password Authentication**: Scrypt password hashing with 16-byte random salts and constant-time verification.
- [x] **Reviewer 1-Click Demo Access**: Instant evaluator login bypass without external OAuth credentials.
- [x] **React 18 Frontend**: Clean, minimal email-client interface matching the company Figma design.
- [x] **CSV Recipient Upload**: Drag-and-drop parsing, email deduplication, invalid address rejection, and sample CSV download.
- [x] **Scheduled Emails View**: Status indicators, planned dispatch timestamps, and recipient overviews.
- [x] **Sent Emails View**: Real delivery timestamps, recipient logs, and Ethereal web preview links.
- [x] **Compose New Email**: Interactive compose modal with delay, hourly limit, rich text toolbar, and "Send Later" popup.
- [x] **GitHub Pages Frontend**: Production client with client-side SPA routing restoration.
- [x] **AWS EC2 Production Deployment**: Containerized with Docker Compose, Nginx reverse proxy, and Let's Encrypt TLS.
- [x] **HTTPS / Custom Domain**: Full SSL/TLS certificate automation for `https://api.nikith.app`.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    User["User Browser / Client"] -->|HTTPS / Cross-Site Cookie| Frontend["React 18 + Vite Frontend\n(GitHub Pages)"]
    Frontend -->|REST API Requests| Nginx["Nginx Reverse Proxy\n(Port 80/443 TLS - AWS EC2)"]
    Nginx -->|Reverse Proxy| Backend["Express.js Backend API\n(Node.js + TypeScript)"]

    Backend -->|Prisma ORM| Postgres[("PostgreSQL 15\nUsers, Senders, Campaigns,\nEmails, Slack Connections")]
    Backend -->|BullMQ Producer| Redis[("Redis 7 (AOF)\nDelayed Queue, Rate Windows,\nDistributed Locks")]
    Backend -->|Index Documents| ES[("Elasticsearch 8.x\nFull-Text Search")]

    Redis -->|Delayed Job Triggers| Worker["BullMQ Worker Process\n(Configurable Concurrency)"]
    Worker -->|Read & Update Status| Postgres
    Worker -->|Atomic Rate Limit & Locks| Redis
    Worker -->|Send Email| SMTP["Ethereal SMTP\n(Nodemailer Transport)"]
    Worker -->|Update Index| ES
    Worker -->|Trigger Alert| Slack["Slack API WebClient\n(Block Kit Notification)"]
```

---

## ⏱️ Scheduling Architecture (No Cron Jobs)

> [!IMPORTANT]
> **No cron jobs are used in this platform.** Neither system crontabs, `node-cron`, nor recurring interval pollers are used to trigger scheduled emails.

### End-to-End Scheduling Lifecycle:
1. **API Ingestion**: The client submits a campaign payload to `POST /api/emails/schedule` with an array of recipients, an optional start time $T$, a delay between emails $D$ (`delayMs`), and an hourly rate limit.
2. **Database Persistence**:
   - A `Campaign` row is inserted in PostgreSQL.
   - For each recipient $i$ ($0, 1, \dots, N-1$), an individual `Email` record is created with:
     $$\text{scheduledAt} = T + (i \times D)$$
     $$\text{idempotencyKey} = \text{sha256}(\text{campaignId} : \text{recipient} : i)$$
     $$\text{status} = \text{SCHEDULED}$$
3. **BullMQ Delayed Job Creation**:
   - An independent BullMQ delayed job is pushed to Redis:
     $$\text{delay} = \max(0, \text{scheduledAt} - \text{now})$$
     $$\text{jobId} = \text{email-}\{\text{emailId}\}$$
   - The returned BullMQ `job.id` is saved back to the PostgreSQL record.
4. **Queue Gating & Worker Execution**:
   - BullMQ relies on Redis sorted sets (`ZSET`) where the score is the target execution timestamp.
   - When the timestamp is reached, Redis atomically shifts the job from `delayed` to `waiting`/`active`.
   - The BullMQ worker receives the job and executes the dispatch sequence.
5. **Transport & Final State Sync**:
   - The worker verifies the email is not already `SENT` and enforces rate limits and minimum send delays.
   - The email is sent via Nodemailer to Ethereal SMTP.
   - The PostgreSQL record is updated to `SENT` with `sentAt` and the Ethereal web preview URL.
   - The Elasticsearch document is synced with status `SENT`.

---

## 🔄 Persistence & Restart Recovery

### How Future Jobs Survive Restarts:
1. **Redis AOF Durability**: Redis is configured with `--appendonly yes`. All BullMQ queue states, delayed sorted sets, and rate counters are written to disk.
2. **Independent Queue State**: The schedule does not live in Node.js process memory. If the backend API, the BullMQ worker, or the entire Docker container restarts:
   - Redis retains the scheduled job timestamps in `bull:email-dispatch-queue:delayed`.
   - Upon restart, the worker connects to Redis and immediately resumes listening.
   - **No re-seeding or re-querying from PostgreSQL is needed.** Jobs dispatch precisely at their originally scheduled time.

### Duplicate Prevention & Idempotency:
- **Database Status Guard**: Before dispatching, the worker performs a fresh read from PostgreSQL:
  ```ts
  if (email.status === 'SENT') {
    return { skipped: true, reason: 'ALREADY_SENT' };
  }
  ```
  If a job was already dispatched, it can never re-trigger SMTP.
- **Redis Distributed Locking**: Each job acquires an atomic Redis lock (`lock:email:{emailId}`) with a unique token and a 45-second TTL (`SET lockKey token PX 45000 NX`). This prevents parallel workers from concurrently executing the same email during network delays.
- **Unique Database Constraint**: The `idempotencyKey` field in PostgreSQL has a `@unique` index, preventing duplicate records from being generated during batch ingestion.

---

## ⚡ Worker Concurrency

- **Configuration Variable**: `WORKER_CONCURRENCY`
- **Default Value**: `10` parallel jobs per worker process
- **Rationale**:
  - Network I/O operations (SMTP handshakes, DNS lookups, Redis Lua calls, and Elasticsearch updates) spend the majority of their time in asynchronous I/O wait.
  - Configurable concurrency allows scaling the worker throughput to match server hardware (e.g., 5 on small single-core instances, 10–20 on multi-core servers) without creating race conditions.
  - Because each job acquires its own isolated Redis lock and handles its own sender throttling atomically, jobs process concurrently with full safety.

---

## ⏳ Minimum Delay Throttling

- **Configuration Variable**: `EMAIL_MIN_DELAY_MS`
- **Default Value**: `2000` ms (2 seconds)
- **Purpose**: Prevents outreach emails from being fired in burst flurries from a single inbox, protecting the sender domain reputation against spam filters.
- **Implementation**:
  - The worker maintains a Redis timestamp key: `last_sent_at:{senderId}` with a 2-hour TTL.
  - Before an email is handed to Nodemailer, the worker checks:
    $$\Delta = \text{now} - \text{lastSent}$$
  - If $\Delta < \text{EMAIL\_MIN\_DELAY\_MS}$, the worker pauses for $(\text{EMAIL\_MIN\_DELAY\_MS} - \Delta)$ milliseconds before dispatching.
  - After dispatch, the new timestamp is recorded atomically in Redis.

---

## 🚦 Hourly Rate Limiting & Zero-Drop Rescheduling

- **Configuration Variable**: `MAX_EMAILS_PER_HOUR`
- **Default Value**: `100` emails per hour per sender
- **Calendar Hour Window**: Uses strict UTC calendar hour windows:
  $$\text{window} = \text{YYYY-MM-DD-HH} \quad (\text{e.g., } 2026-09-30-02)$$
- **Atomic Evaluation**: An atomic Redis Lua script checks and increments the counter:
  - Key: `rate:{senderId}:{window}` with a 2-hour TTL.
  - If `currentCount < MAX_EMAILS_PER_HOUR`, the counter is incremented and execution continues.
- **Zero-Drop Rescheduling Behavior**:
  - When the hourly limit is reached, **emails are never discarded, dropped, or marked as failed**.
  - The next calendar hour window is computed (`nextWindowStart = top of next UTC hour`).
  - An overflow counter (`overflow_count:{senderId}:{nextWindow}`) determines a staggered offset:
    $$\text{staggerDelay} = (\text{overflowIndex} - 1) \times \text{delayMs}$$
    $$\text{nextRunTime} = \text{nextWindowStart} + \text{staggerDelay}$$
  - The email's `scheduledAt` date is updated in PostgreSQL, maintaining accurate UI visibility.
  - A new BullMQ delayed job is added for `nextRunTime`.

---

## 🔔 Slack Notifications

- **OAuth Flow**: Users initiate connection via `/api/slack/connect`, authorizing their Slack workspace with `chat:write` and `incoming-webhook` scopes.
- **Token Storage**: Credentials (access token, team name, team ID, channel name, and webhook URL) are stored in the PostgreSQL `SlackConnection` table linked to the user account.
- **Trigger Condition**: When a sender hits their hourly limit in a given calendar window, a rich Block Kit alert is generated.
- **Hourly Deduplication**: To prevent spamming channels with an alert for every single overflow email, the system uses an atomic Redis key:
  `rate_alert_sent:{senderId}:{hourWindow}` with a 1-hour TTL (`SET ... NX`).
  Exactly **one alert** is sent per sender per clock hour.
- **Graceful Degradation**: If Slack is not connected, the rate limiter and rescheduling pipeline continue operating with zero disruption. When Slack is connected later, future alerts trigger automatically.
- **Disconnection**: Users can unlink their Slack workspace at any time via `POST /api/slack/disconnect`.

---

## 🔍 Elasticsearch Full-Text Search

- **Index Name**: `emails`
- **Indexed Fields**: `id`, `userId`, `senderId`, `campaignId`, `recipient`, `subject`, `body`, `status`, `scheduledAt`, `sentAt`, `etherealPreviewUrl`, `createdAt`.
- **Indexing Triggers**:
  1. When an email is first scheduled (`status: SCHEDULED`).
  2. When an email is dispatched or rescheduled (`status: SENT` or `status: FAILED`).
- **Search Capabilities**:
  - Scoped by `userId` to ensure strict tenant data isolation.
  - Multi-match query across `subject`, `body`, and `recipient`.
- **Resilient Fallback**: If Elasticsearch is unavailable or starting up, the search service automatically falls back to PostgreSQL relational queries with `ILIKE` so search functionality remains uninterrupted.

---

## 📊 Bull Board Telemetry

- **Location**: `/admin/queues`
- **Purpose**: Provides visual real-time monitoring of the BullMQ email dispatch queue (`email-dispatch-queue`).
- **Metrics Tracked**:
  - **Waiting**: Jobs ready to be picked up immediately.
  - **Active**: Jobs currently being processed by worker threads.
  - **Delayed**: Jobs waiting for their scheduled timestamp.
  - **Completed**: Successfully delivered outreach jobs.
  - **Failed**: Jobs that encountered unrecoverable errors after maximum retry attempts.
- **Production URL**: [https://api.nikith.app/admin/queues](https://api.nikith.app/admin/queues)

---

## 🔐 Authentication Architecture

The application supports four authentication options:

1. **Email / Password Registration**:
   - Endpoint: `POST /api/auth/register`
   - Password Hashing: Node.js built-in `crypto.scrypt` with a unique 16-byte cryptographically secure random salt (`salt:derivedKeyHex`).
   - Generates default sender inbox and issues authenticated JWT cookie.
2. **Email / Password Login**:
   - Endpoint: `POST /api/auth/login`
   - Verification: Constant-time comparison using `crypto.timingSafeEqual` to prevent timing attacks.
   - Generic 401 error message (`"Invalid email or password."`) to prevent account enumeration.
3. **Google OAuth 2.0**:
   - Endpoints: `GET /api/auth/google`, `GET /api/auth/google/callback`
   - Uses `google-auth-library` to verify ID tokens, sync Google profiles, and issue session cookies.
4. **Reviewer 1-Click Demo Access**:
   - Endpoint: `POST /api/auth/demo-login`
   - Dedicated evaluator button on the login screen allowing instant dashboard access without OAuth credentials.

### Session Management:
- JWT tokens signed with `JWT_SECRET` containing `{ userId, email, name }`.
- Stored in an HTTP-only cookie (`token`) with 7-day expiration.
- In production, cookies are flagged with `secure: true` and `sameSite: 'none'` to enable cross-site session authentication between GitHub Pages (`https://kadapalanikith.github.io`) and the AWS backend (`https://api.nikith.app`).

---

## 💻 Frontend Implementation

- **Framework**: React 18 with TypeScript and Vite.
- **Styling**: Tailwind CSS with custom components following the company Figma design.
- **Views**:
  - **Login Page**: Centered card, Google login button, email/password inputs, green primary CTA, registration link, and Reviewer 1-Click Access button.
  - **Registration Page**: Form with email, password, confirm password, input validation, and automatic login on success.
  - **Dashboard Layout**: Left sidebar with `ONB` brand logo, user profile dropdown, green-bordered `Compose` button, `Scheduled` and `Sent` navigation items with live counters, top search bar, and action triggers.
  - **Email List View**: Recipient name, orange scheduled badge (`Sun 9:15 AM`) or gray sent badge (`Sent`), subject, preview snippet, and star interaction.
  - **Compose Modal**: Full-screen modal with From, To, Subject, Delay, Hourly Limit, formatting toolbar, Send Later popup (date-time picker + quick presets), and CSV upload.
  - **Email Detail View**: Full-screen reader layout with back button, sender avatar, recipient metadata, delivery timestamp, and rendered email body.
  - **Feedback States**: Table loading skeletons, empty state illustrations, and toast notifications.

---

## 🔑 Environment Variables Reference

| Variable | Required | Default | Description | Example / Placeholder |
| :--- | :---: | :--- | :--- | :--- |
| `PORT` | No | `5000` | Port for Express backend HTTP server | `5000` |
| `NODE_ENV` | No | `development` | Node environment (`development`, `production`, `test`) | `production` |
| `CLIENT_URL` | Yes | `http://localhost:5173` | Allowed frontend origin for CORS and OAuth redirects | `https://kadapalanikith.github.io` |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string | `postgresql://user:password@localhost:5432/dbname` |
| `REDIS_URL` | Yes | `redis://localhost:6379` | Redis connection URL | `redis://localhost:6379` |
| `ELASTICSEARCH_URL` | No | `http://localhost:9200` | Elasticsearch HTTP endpoint | `http://localhost:9200` |
| `JWT_SECRET` | Yes | — | Secret string for signing session JWT tokens | `<your-jwt-secret-min-32-chars>` |
| `JWT_EXPIRES_IN` | No | `7d` | Expiration window for JWT session cookies | `7d` |
| `MAX_EMAILS_PER_HOUR` | No | `100` | Maximum outreach emails permitted per sender per hour | `100` |
| `EMAIL_MIN_DELAY_MS` | No | `2000` | Minimum throttle duration between consecutive sends (ms) | `2000` |
| `WORKER_CONCURRENCY` | No | `10` | Parallel job capacity per BullMQ worker process | `10` |
| `ETHEREAL_USER` | No | *(auto-generated)* | Ethereal SMTP username (auto-generated if empty) | `<your-ethereal-user>` |
| `ETHEREAL_PASSWORD` | No | *(auto-generated)* | Ethereal SMTP password (auto-generated if empty) | `<your-ethereal-password>` |
| `GOOGLE_CLIENT_ID` | No | — | Google Cloud OAuth 2.0 Client ID | `<your-google-client-id>` |
| `GOOGLE_CLIENT_SECRET` | No | — | Google Cloud OAuth 2.0 Client Secret | `<your-google-client-secret>` |
| `GOOGLE_CALLBACK_URL` | No | `http://localhost:5000/api/auth/google/callback` | OAuth redirect URI configured in Google Console | `https://api.nikith.app/api/auth/google/callback` |
| `SLACK_CLIENT_ID` | No | — | Slack App Client ID | `<your-slack-client-id>` |
| `SLACK_CLIENT_SECRET` | No | — | Slack App Client Secret | `<your-slack-client-secret>` |
| `SLACK_REDIRECT_URI` | No | `http://localhost:5000/api/slack/callback` | OAuth redirect URI configured in Slack App | `https://api.nikith.app/api/slack/callback` |

---

## 🛠️ Local Development Setup

### 1. Prerequisites
- **Node.js**: v18 or v20+
- **Docker & Docker Compose**: For local PostgreSQL, Redis, and Elasticsearch containers

### 2. Clone Repository & Install Dependencies
```bash
git clone https://github.com/kadapalanikith/reachinbox-email-scheduler.git
cd reachinbox-email-scheduler
npm install
```

### 3. Start Local Infrastructure
Start PostgreSQL, Redis, and Elasticsearch containers:
```bash
npm run docker:up
```

### 4. Configure Environment
Copy the example environment file:
```bash
cp backend/.env.example backend/.env
```
*(Review `backend/.env` and update values if using custom credentials).*

### 5. Setup Database Schema
Generate the Prisma client and apply database migrations:
```bash
npm run db:generate
npm run db:migrate
```

### 6. Run the Application
Open two terminal windows:

**Terminal 1 — Backend & BullMQ Worker:**
```bash
npm run dev:backend
```
*(Runs on `http://localhost:5000` with the BullMQ worker active in-process).*

**Terminal 2 — Frontend Application:**
```bash
npm run dev:frontend
```
*(Vite dev server starts on `http://localhost:5173`).*

---

## 🧪 Testing & Verification

### Test Suite Execution:
Run the Vitest test suite in the backend workspace:
```bash
npm run test --workspace=backend
```

### Current Test Status:
**31 tests passing across 7 test files**:
- `src/__tests__/auth.test.ts` (13 tests): Scrypt hashing, timing-safe checks, malformed hash handling, email validation, registration, duplicate prevention, password length enforcement, login, non-existent users, demo login, session retrieval, logout.
- `src/__tests__/csvParser.test.ts` (6 tests): CSV header formats, email extraction, duplicate elimination, invalid row rejection, empty file handling.
- `src/__tests__/rateLimiter.test.ts` (5 tests): UTC calendar window math, next-window calculations, atomic Lua responses, staggered overflow delay calculations.
- `src/__tests__/api.test.ts` (3 tests): JWT signing, tampered token rejection, CSV string parsing.
- `src/__tests__/scheduler.test.ts` (1 test): Staggered delay scheduling formula verification.
- `src/__tests__/persistence.test.ts` (1 test): Queue recovery across worker restart cycles.
- `src/__tests__/idempotency.test.ts` (2 tests): Prevention of duplicate sends for `SENT` emails and distributed lock contention handling.

### Production Builds:
```bash
# Build backend
npm run build --workspace=backend

# Build frontend
npm run build --workspace=frontend
```

---

## ☁️ Production Deployment Architecture

The production environment is decoupled across two platforms:

```
[ GitHub Pages (Static SPA) ]
  URL: https://kadapalanikith.github.io/reachinbox-email-scheduler/
       │
       │ HTTPS / Secure SameSite:None Cookies
       ▼
[ AWS EC2 (Ubuntu 24.04 LTS) ]
  ├── Nginx Reverse Proxy (Ports 80/443 with Let's Encrypt TLS)
  │     └── Host: https://api.nikith.app
  ├── Docker Network: reachinbox_network
  │     ├── Backend API Container (Express + Node.js, Port 5000)
  │     ├── BullMQ Worker Container (Independent Process)
  │     ├── PostgreSQL 15 Container (Persistent volume: postgres_data)
  │     ├── Redis 7 Container (AOF persistence, volume: redis_data)
  │     └── Elasticsearch 8.11 Container (Persistent volume: elasticsearch_data)
```

- **Frontend Hosting**: Hosted on **GitHub Pages**, deployed automatically via GitHub Actions CI/CD on every push to `main`.
- **API & Queue Engine**: Hosted on an **AWS EC2** instance running Docker Compose.
- **TLS & Reverse Proxy**: Managed by **Nginx** with automatic Let's Encrypt certificates.
- **Separation of Concerns**: The API server and BullMQ worker run as separate Docker containers to ensure API responsiveness during high worker load.

---

## 📋 Assignment Requirement Mapping

| Assignment Requirement | Implementation | Status |
| :--- | :--- | :---: |
| **Email Scheduling** | Staggered timestamp formula in `emailService.ts` via BullMQ delayed jobs | ✅ Complete |
| **BullMQ & Redis Queue** | Pure Redis sorted set delayed jobs (`email-dispatch-queue`), no cron jobs | ✅ Complete |
| **Database Persistence** | PostgreSQL via Prisma ORM for Users, Senders, Campaigns, Emails | ✅ Complete |
| **Worker Concurrency** | Configurable concurrency via `WORKER_CONCURRENCY` in `emailWorker.ts` | ✅ Complete |
| **Minimum Send Delay** | Enforced via Redis `last_sent_at` timestamp gating (`EMAIL_MIN_DELAY_MS`) | ✅ Complete |
| **Hourly Rate Limiting** | Atomic Lua script evaluating calendar windows (`MAX_EMAILS_PER_HOUR`) | ✅ Complete |
| **Zero-Drop Rescheduling** | Overflow emails rescheduled to next hour window with staggered offsets | ✅ Complete |
| **Restart Recovery** | Redis AOF persistence resumes delayed queues without re-querying DB | ✅ Complete |
| **Idempotency** | PostgreSQL status check, SHA-256 keys, and Redis distributed locks | ✅ Complete |
| **Slack Notifications** | OAuth flow, PostgreSQL token storage, Block Kit alerts with 1-hr deduplication | ✅ Complete |
| **Elasticsearch** | Document sync on schedule/send, scoped multi-match search with SQL fallback | ✅ Complete |
| **Bull Board Dashboard** | Embedded queue telemetry at `/admin/queues` via `@bull-board/express` | ✅ Complete |
| **Google OAuth** | Google Cloud OAuth 2.0 flow via `google-auth-library` and JWT cookie | ✅ Complete |
| **Email/Password Auth** | Secure registration and login with Node.js `scrypt` hashing and salts | ✅ Complete |
| **Reviewer Demo Access** | 1-click evaluator login bypass on login screen | ✅ Complete |
| **React Frontend** | React 18, Vite, TypeScript, Tailwind CSS matching company Figma design | ✅ Complete |
| **CSV Recipient Upload** | Ingestion parser supporting drag-and-drop, deduplication, and template download | ✅ Complete |
| **Scheduled & Sent Views** | Dedicated views with status badges, delivery dates, and Ethereal preview links | ✅ Complete |
| **Production Deployment** | AWS EC2 (Docker + Nginx TLS) + GitHub Pages frontend | ✅ Complete |

---

## ⚖️ Assumptions & Trade-offs

1. **Calendar Hour vs. Sliding Window Rate Limiting**:
   - The system implements calendar hour windows (`YYYY-MM-DD-HH` UTC) matching the assignment's explicit key schema (`rate:{senderId}:{hourWindow}`).
   - *Trade-off*: When an overflow occurs, jobs are staggered into the subsequent calendar hour (`nextWindowStartTime + (overflowIndex - 1) * delayMs`), distributing traffic evenly across the new window.
2. **Ethereal SMTP Provisioning**:
   - When no custom SMTP credentials are provided in `.env`, Nodemailer dynamically provisions a valid Ethereal account on startup and logs the login URL.
   - *Advantage*: Enables realistic end-to-end email delivery with browser-rendered previews without requiring a paid SMTP service.
3. **Dual Authentication Strategy**:
   - Google OAuth, Email/Password, and Reviewer Demo Access share the exact same JWT session cookie format.
   - *Advantage*: Reviewers can test every feature immediately without setting up Google OAuth or creating credentials, while production users can sign up with email/password or Google.
4. **Elasticsearch Resilience**:
   - Elasticsearch runs in single-node mode with basic full-text indexing.
   - *Trade-off*: If Elasticsearch is offline or low on memory, search calls automatically fall back to PostgreSQL `ILIKE` queries, ensuring zero disruption to the user experience.

---

## 📡 API Reference Summary

| Method | Endpoint | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/health` | Public | System health check (Redis, Elasticsearch status) |
| `GET` | `/admin/queues` | Public | Bull Board queue telemetry dashboard |
| `POST`| `/api/auth/register` | Public | Register new user with email and password |
| `POST`| `/api/auth/login` | Public | Authenticate with email and password |
| `GET` | `/api/auth/google` | Public | Initiates Google OAuth 2.0 consent flow |
| `GET` | `/api/auth/google/callback` | Public | Google OAuth redirect handler; sets JWT cookie |
| `POST`| `/api/auth/demo-login` | Public | 1-click Reviewer / Evaluator test access |
| `GET` | `/api/auth/me` | Cookie / Bearer | Returns current authenticated user profile |
| `POST`| `/api/auth/logout` | Public | Clears session cookie |
| `POST`| `/api/emails/schedule` | Cookie / Bearer | Schedules an outreach campaign with staggered delays |
| `POST`| `/api/emails/parse-csv` | Cookie / Bearer | Validates and parses uploaded CSV recipient list |
| `GET` | `/api/emails/scheduled` | Cookie / Bearer | Returns paginated list of scheduled/processing emails |
| `GET` | `/api/emails/sent` | Cookie / Bearer | Returns paginated list of sent/failed email history |
| `GET` | `/api/emails/search?q=...` | Cookie / Bearer | Scoped full-text search across subject, body, recipient |
| `GET` | `/api/emails/senders` | Cookie / Bearer | Lists configured sender email accounts for user |
| `GET` | `/api/slack/connect` | Cookie / Bearer | Initiates Slack OAuth workspace authorization |
| `GET` | `/api/slack/callback` | Public | Slack OAuth callback and credential persistence |
| `GET` | `/api/slack/status` | Cookie / Bearer | Returns connection status for Slack alerts |
| `POST`| `/api/slack/disconnect` | Cookie / Bearer | Unlinks Slack workspace |
| `POST`| `/api/slack/test` | Cookie / Bearer | Dispatches a test rate-limit alert to Slack |
