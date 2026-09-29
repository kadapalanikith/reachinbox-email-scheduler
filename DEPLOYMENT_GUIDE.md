# ReachInbox Email Scheduler — AWS EC2 Production Deployment Guide

This guide provides step-by-step instructions for deploying the **ReachInbox Email Scheduler** onto an **AWS EC2** instance using **Docker Compose**, with the frontend hosted on **GitHub Pages**.

---

## 📌 Architecture Overview

```
                                +-------------------------------------------+
                                |          GitHub Pages (Static Host)       |
                                |     React 18 + Vite + Tailwind Dashboard  |
                                |  URL: https://<user>.github.io/<repo>/    |
                                +---------------------+---------------------+
                                                      |
                                                      | HTTPS (CORS + Cookies)
                                                      v
+---------------------------------------------------------------------------------------------------+
| AWS EC2 (Ubuntu 24.04 LTS — t3.medium / t3.large)                                                 |
|                                                                                                   |
|   +---------------------------------------------------------------------------------------------+ |
|   | Nginx Reverse Proxy (Port 80/443 with Let's Encrypt TLS)                                    | |
|   +-------------------+---------------------------------------------+---------------------------+ |
|                       |                                             |                             |
|                       v                                             v                             |
|       +---------------+---------------+             +---------------+---------------+             |
|       | Backend API Container (Express) |             | Bull Board Telemetry UI       |             |
|       | (Port 5000, START_WORKER=false)|             | (/admin/queues)               |             |
|       +-------+---------------+-------+             +-------------------------------+             |
|               |               |                                                                   |
|    Prisma ORM |               | BullMQ Producer                                                   |
|               v               v                                                                   |
|       +-------+-------+  +----+----------+             +-------------------------------+          |
|       | PostgreSQL 15 |  | Redis 7 (AOF) |<------------| BullMQ Worker Container       |          |
|       | Container     |  | Container     |  Delayed    | (Separate process,            |          |
|       | Named Volume: |  | Named Volume: |  Jobs       |  Concurrency, Rate Limiting,  |          |
|       | postgres_data |  | redis_data    |             |  Min Delay, Rescheduling)     |          |
|       +---------------+  +---------------+             +---------------+---------------+          |
|               ^                                                        |                          |
|               |                                                        | SMTP Dispatch            |
|               +--------------------------------------------------------+                          |
|                                                                        |                          |
|       +------------------------------------+                           v                          |
|       | Elasticsearch 8.11 Container       |<------------------+ Ethereal SMTP                    |
|       | Named Volume: elasticsearch_data   |  Indexed Emails   | (Web Preview URL)                |
|       +------------------------------------+                   +----------------------------------+
+---------------------------------------------------------------------------------------------------+
```

---

## 💰 1. AWS Cost & Budget Plan ($100 Credits)

To preserve your $100 AWS credits:
* **No Managed Databases**: PostgreSQL, Redis, and Elasticsearch run inside Docker on the single EC2 instance (saving ~$40/mo in RDS and ElastiCache charges).
* **No Application Load Balancer / NAT Gateway**: Nginx runs directly on the EC2 instance for TLS termination and reverse proxying (saving ~$25–$35/mo).
* **Selected Region**: `ap-south-1` (Mumbai) for lowest latency from India, or `us-east-1` (N. Virginia) for cheapest spot/on-demand pricing.

### Estimated Monthly Cost Breakdown:
| Resource | Specification | Estimated Cost / Month |
| :--- | :--- | :--- |
| **EC2 Instance** | `t3.medium` (2 vCPU, 4 GB RAM) | ~$30.36 / month (~$0.0416/hr) |
| **EBS Storage** | 45 GB gp3 SSD (3000 IOPS, 125 MB/s) | ~$3.60 / month (~$0.08/GB) |
| **Data Transfer** | Outbound traffic (< 10 GB/month) | ~$0.90 / month |
| **Total Expected** | | **~$35.00 / month** |

> [!TIP]
> Your $100 credit pool provides approximately **almost 3 full months** of continuous 24/7 runtime on `t3.medium`.

### Configure AWS Budget Alerts:
1. Open the [AWS Billing & Cost Management Console](https://console.aws.amazon.com/billing/).
2. Navigate to **Budgets** → **Create budget**.
3. Choose **Cost budget (Recommended)**.
4. Set Budget Name: `ReachInbox-Assignment-Budget`.
5. Set Target Amount: `$100.00`.
6. Add 4 Alert Thresholds to your email:
   - **20%** ($20.00)
   - **40%** ($40.00)
   - **60%** ($60.00)
   - **80%** ($80.00)

---

## 🔒 2. EC2 Security Group Configuration

Create an EC2 Security Group named `reachinbox-sg` with the following **Inbound Rules**:

| Type | Protocol | Port Range | Source | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **SSH** | TCP | `22` | `My IP` (or `0.0.0.0/0` if dynamic) | Secure terminal access |
| **HTTP** | TCP | `80` | `0.0.0.0/0` | Let's Encrypt challenge & HTTP redirect |
| **HTTPS** | TCP | `443` | `0.0.0.0/0` | Secure API & Bull Board access |

> [!CAUTION]
> **DO NOT open ports 5432 (PostgreSQL), 6379 (Redis), 9200 (Elasticsearch), or 5000 (Backend API) publicly.**
> These services communicate exclusively over Docker's internal bridge network (`reachinbox_net`).

---

## 🖥️ 3. Launching the EC2 Instance

1. Navigate to **EC2 Console** → **Launch Instance**.
2. **Name**: `reachinbox-scheduler-production`.
3. **AMI**: `Ubuntu Server 24.04 LTS (HVM), SSD Volume Type` (64-bit x86).
4. **Instance Type**: `t3.medium` (2 vCPU, 4 GiB Memory).
5. **Key Pair**: Create new or select existing (e.g. `reachinbox-key.pem`).
6. **Network Settings**:
   - Assign public IP: **Enable**.
   - Security Group: Select `reachinbox-sg`.
7. **Storage**: Configure Storage to **45 GB gp3**.
8. Click **Launch Instance**.

---

## ⚡ 4. Server Setup & Docker Installation

SSH into your new EC2 instance:
```bash
chmod 400 reachinbox-key.pem
ssh -i reachinbox-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
```

Run system updates and install Docker + Docker Compose:
```bash
# Update Ubuntu packages
sudo apt update && sudo apt upgrade -y

# Install Docker dependencies
sudo apt install -y ca-certificates curl gnupg lsb-release git

# Add Docker official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker apt repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine & Docker Compose Plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Grant ubuntu user docker access
sudo usermod -aG docker ubuntu
newgrp docker

# Verify Docker
docker --version
docker compose version
```

### Configure Virtual Memory for Elasticsearch:
Elasticsearch requires `vm.max_map_count` to be at least 262144:
```bash
sudo sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```

---

## 📦 5. Clone Repository & Configure Environment

Clone the repository onto the instance:
```bash
git clone https://github.com/kadapalanikith/reachinbox-email-scheduler.git
cd reachinbox-email-scheduler
```

Create your production `.env` from the template:
```bash
cp .env.production.example .env
nano .env
```

### Configure production values:
* Generate a secure JWT secret:
  ```bash
  openssl rand -hex 32
  ```
* Set `CLIENT_URL` to your GitHub Pages URL (e.g. `https://kadapalanikith.github.io/reachinbox-email-scheduler`).
* Set `POSTGRES_PASSWORD` and `DATABASE_URL`.
* Set `GOOGLE_CALLBACK_URL` and `SLACK_REDIRECT_URI` with your domain or public IP.

---

## 🌐 6. Nginx & SSL Certificate Setup (Let's Encrypt)

If you have a domain (e.g. `api.yourdomain.com`):

1. Point an **A Record** in your DNS provider:
   - Host: `api` (or `@`)
   - Value: `<YOUR_EC2_PUBLIC_IP>`
   - TTL: 300 seconds

2. Temporary HTTP setup for cert issuance:
   ```bash
   cp nginx/nginx.http-only.conf nginx/nginx.conf
   docker compose -f docker-compose.prod.yml up -d nginx
   ```

3. Issue Let's Encrypt Certificate:
   ```bash
   docker compose -f docker-compose.prod.yml run --rm certbot certonly \
     --webroot --webroot-path=/var/www/certbot \
     -d api.yourdomain.com \
     --email your-email@gmail.com --agree-tos --no-eff-email
   ```

4. Enable full HTTPS Nginx config:
   ```bash
   # Edit nginx/nginx.conf, replacing YOUR_DOMAIN with api.yourdomain.com
   sed -i 's/YOUR_DOMAIN/api.yourdomain.com/g' nginx/nginx.conf
   docker compose -f docker-compose.prod.yml restart nginx
   ```

*(If deploying without a custom domain, Nginx serves on HTTP port 80 using `nginx.http-only.conf`).*

---

## 🚀 7. Running the Production Stack

Run the automated deployment script:
```bash
chmod +x deploy.sh
./deploy.sh
```

Or run manually:
```bash
# 1. Build and start containers
docker compose -f docker-compose.prod.yml up -d --build

# 2. Run Prisma migrations
docker compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy

# 3. Optional: Seed initial reviewer user
docker compose -f docker-compose.prod.yml exec -T backend npm run db:seed
```

Verify all 6 containers are healthy and running:
```bash
docker compose -f docker-compose.prod.yml ps
```
Expected output:
* `reachinbox_postgres` (Up, healthy)
* `reachinbox_redis` (Up, healthy)
* `reachinbox_elasticsearch` (Up, healthy)
* `reachinbox_backend` (Up, healthy)
* `reachinbox_worker` (Up)
* `reachinbox_nginx` (Up, healthy)

---

## 🎨 8. Deploying Frontend to GitHub Pages

1. In your GitHub repository:
   - Go to **Settings** → **Secrets and variables** → **Actions**.
   - Click **New repository secret**.
   - Name: `VITE_API_URL`
   - Value: `https://api.yourdomain.com` (or `http://<EC2_PUBLIC_IP>`)
2. Go to **Settings** → **Pages**:
   - Under **Build and deployment** → **Source**, select **GitHub Actions**.
3. Push a commit or trigger manually:
   - Go to **Actions** → **Deploy Frontend to GitHub Pages** → **Run workflow**.
4. Once completed, your frontend is live at:
   `https://<your-username>.github.io/reachinbox-email-scheduler/`

---

## 🔑 9. Google & Slack OAuth Production Callbacks

### Google Cloud Console:
1. Open [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Edit your OAuth 2.0 Client ID:
   - **Authorized JavaScript origins**:
     `https://<your-username>.github.io`
   - **Authorized redirect URIs**:
     `https://api.yourdomain.com/api/auth/google/callback`

### Slack App Settings:
1. Open [Slack API Apps](https://api.slack.com/apps).
2. Under **OAuth & Permissions** → **Redirect URLs**:
   - Add: `https://api.yourdomain.com/api/slack/callback`
3. Save changes.

---

## 🧪 10. Verification & Restart Testing

### A. Health Check
```bash
curl -i https://api.yourdomain.com/health
```
Expected response:
```json
{
  "status": "ok",
  "environment": "production",
  "services": {
    "redis": "connected",
    "elasticsearch": "connected"
  }
}
```

### B. Bull Board Queue Telemetry
Open `https://api.yourdomain.com/admin/queues` in your browser. Verify real-time counters for **waiting**, **delayed**, **active**, **completed**, and **failed** jobs.

### C. Persistent Storage / Restart Test
1. Schedule 5 emails in the dashboard with a 2-minute delay.
2. Verify jobs appear under "Delayed" in Bull Board.
3. Simulate container restart:
   ```bash
   docker compose -f docker-compose.prod.yml down
   docker compose -f docker-compose.prod.yml up -d
   ```
4. Verify jobs and database records remain completely intact and continue executing!

---

## 💾 11. Database Backup & Restore

### Backup PostgreSQL:
```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U reachinbox reachinbox_scheduler > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore PostgreSQL:
```bash
cat backup_<timestamp>.sql | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U reachinbox -d reachinbox_scheduler
```

---

## 🛑 12. Teardown / Resource Termination

When evaluation is complete, avoid unnecessary charges:
```bash
# On the EC2 instance: Stop all containers
docker compose -f docker-compose.prod.yml down

# In AWS Console:
# 1. Stop Instance (preserves disk, negligible cost)
# OR
# 2. Terminate Instance (completely frees EC2 and EBS storage)
```
