# Samadhaan

**A smart, location-aware complaint management platform for campuses, institutions, and civic bodies.**

Samadhaan turns complaint reporting from a slow, opaque ticketing process into a transparent community resolution system. Users can report issues with media proof and GPS coordinates, verify nearby complaints, and track progress in real time. Administrators get a live command dashboard with analytics, status management, location insights, CSV exports, and AI-assisted complaint categorization.

Built for the **Vibe2Ship Hackathon** and deployed on **Google Cloud Run**.

## Live Demo

**Cloud Run:** https://samadhaan-vibe2ship-297216988135.europe-west1.run.app  
**Health Check:** https://samadhaan-vibe2ship-297216988135.europe-west1.run.app/api/health
<img width="1912" height="967" alt="image" src="https://github.com/user-attachments/assets/af4f14b5-8d47-4969-81eb-f0c114bc5a8c" />

<img width="1897" height="855" alt="image" src="https://github.com/user-attachments/assets/ef236c1a-cf44-404f-b330-fd49206ba0e1" />

<img width="1907" height="832" alt="image" src="https://github.com/user-attachments/assets/0028842d-53b7-4bbc-8047-beff62415b0c" />

<img width="1907" height="837" alt="image" src="https://github.com/user-attachments/assets/955b17ce-7260-4f19-a85c-0bc06b3321ce" />

<img width="1867" height="765" alt="image" src="https://github.com/user-attachments/assets/51ca013b-1588-43de-b5a5-74da9a6ba0d1" />




### Demo Login For Judges

Use these credentials to review the full admin workflow:

```text
Admin URL: /admin
Email: admin@samadhaan.demo
Password: Samadhaan@123
```

For the normal user workflow, create a new account from the Register page and submit a test complaint.

## Why Samadhaan

Most complaint systems stop at "submit a ticket." Samadhaan goes further:

- Complaints are geo-tagged so administrators can identify hotspots.
- Users can add media proof and choose anonymous reporting.
- Community verification helps separate real, urgent issues from noise.
- Real-time updates keep users and admins aligned.
- AI-assisted categorization reduces manual triage.
- Admin dashboards turn complaint data into action.

## Key Features

### User Experience

- Secure registration and login with JWT authentication.
- Submit complaints with category, priority, location, description, anonymity option, and media attachments.
- Capture GPS coordinates using browser location support.
- View and filter personal complaint history.
- Verify nearby issues reported by other users.
- Real-time updates when complaints are created, verified, or resolved.

### Admin Experience

- Role-based admin dashboard.
- View all complaints with filters and detailed status management.
- Update complaint status and handler information.
- Track total, pending, resolved, verified, and high-priority complaints.
- Analyze category distribution, active zones, response trends, and contribution leaderboards.
- Export complaint data as CSV for reporting.

### Intelligence Layer

- AI category suggestions using OpenAI-compatible vision/text workflows when configured.
- Local heuristic fallback when no AI key is available.
- Spam, abusive content, and duplicate complaint screening.
- MongoDB geospatial indexing for nearby complaint discovery.

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React, TypeScript, Vite, Material UI, Recharts, Lucide React |
| Backend | Node.js, Express.js, Socket.io, Express Validator |
| Database | MongoDB Atlas, Mongoose, GeoJSON, 2dsphere indexes |
| Auth | JWT, bcryptjs, role-based access control |
| Media | Multer, Sharp, local uploads, optional AWS S3 |
| AI | OpenAI API support with heuristic fallback |
| Deployment | Docker, Google Cloud Run, Cloud Build |
| Testing | Playwright-style E2E setup, Selenium assets, backend smoke tests |

## Architecture

```text
User Browser
  |
  | React + Vite frontend
  v
Cloud Run container
  |
  | Express REST API + Socket.io
  v
MongoDB Atlas

Optional integrations:
  - OpenAI API for AI categorization
  - AWS S3 for production media storage
  - SMTP for password reset emails
```

The production Docker image builds the React frontend, copies the static files into the Express backend, and serves the full application from a single Cloud Run service.

## Repository Structure

```text
.
|-- backend/                 # Express API, MongoDB models, controllers, routes
|-- frontend-new/            # React + TypeScript + Vite frontend
|-- frontend/                # Legacy static frontend
|-- e2e-tests/               # End-to-end testing assets
|-- selenium_test/           # Selenium-related project files
|-- Dockerfile               # Full-stack Cloud Run container
|-- CLOUD_RUN_DEPLOYMENT.md  # Cloud Run deployment notes
`-- README.md
```

## API Overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Service health check |
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Current user profile |
| POST | `/api/complaints` | Submit complaint |
| GET | `/api/complaints/my` | Logged-in user's complaints |
| GET | `/api/complaints/nearby` | Nearby geo-tagged complaints |
| GET | `/api/complaints` | Admin complaint list |
| PATCH | `/api/complaints/:id/status` | Admin status update |
| POST | `/api/complaints/:id/verify` | Community verification vote |
| POST | `/api/complaints/ai-category` | AI category preview |
| GET | `/api/stats/all` | Admin dashboard statistics |
| GET | `/api/export/csv` | Export complaints |

## Local Development

### Prerequisites

- Node.js 20+
- MongoDB Atlas URI or local MongoDB
- npm

### Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on:

```text
http://localhost:5000
```

### Frontend

```bash
cd frontend-new
npm install
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

For local frontend-to-backend API calls, set:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## Environment Variables

### Required

```env
NODE_ENV=production
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/samadhaan?retryWrites=true&w=majority
JWT_SECRET=replace_with_a_long_random_secret
```

### Recommended Admin Seed

```env
ADMIN_EMAIL=admin@samadhaan.demo
ADMIN_PASSWORD=Samadhaan@123
ADMIN_NAME=Admin
```

These variables create the demo admin user when the backend starts. Change the password after hackathon judging if this deployment remains public.

### Optional

```env
CLIENT_URL=https://your-frontend-url
CLIENT_URLS=https://your-frontend-url,https://your-custom-domain
OPENAI_API_KEY=your_openai_key
OPENAI_VISION_MODEL=gpt-4o-mini
AWS_REGION=your_aws_region
AWS_S3_BUCKET=your_bucket
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
EMAIL_FROM=no-reply@samadhaan.local
```

## Deploying To Google Cloud Run

From the repository root:

```bash
gcloud run deploy samadhaan-vibe2ship \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,MONGO_URI="YOUR_MONGODB_URI",JWT_SECRET="YOUR_LONG_SECRET"
```

Important deployment notes:

- Deploy from the repository root so Cloud Run uses the root `Dockerfile`.
- Keep container port as `8080`.
- Leave container command and arguments blank.
- In MongoDB Atlas, allow Cloud Run to connect. For hackathon/demo testing, `0.0.0.0/0` works; for production, use stricter controls.
- If `/` returns backend JSON, `NODE_ENV` is not set to `production` or the old backend-only deployment is running.
- If Cloud Run shows `Service Unavailable`, check logs for MongoDB connection errors first.

More deployment notes are in [CLOUD_RUN_DEPLOYMENT.md](./CLOUD_RUN_DEPLOYMENT.md).

## Testing And Verification

Useful checks:

```bash
# Frontend production build
cd frontend-new
npm run build

# Backend syntax check
cd ../backend
node --check server.js

# Docker production build from repo root
cd ..
docker build -t samadhaan-cloud-run-test .
```

After deployment:

```bash
curl https://samadhaan-vibe2ship-297216988135.europe-west1.run.app/api/health
```

Expected:

```json
{"status":"OK","message":"Samadhaan API is running"}
```

## What Makes It Hackathon-Ready

- Full-stack product, not just a prototype.
- Real deployment on Google Cloud Run.
- Practical public-interest use case with campus and civic relevance.
- Location intelligence through GPS coordinates and geospatial queries.
- AI-assisted triage with graceful fallback.
- Real-time complaint lifecycle updates.
- Admin analytics that support measurable action.
- Dockerized deployment path suitable for cloud evaluation.

## Future Scope

- Google Maps JavaScript API heatmaps and marker clustering.
- SLA tracking and automatic escalation.
- Department-wise assignment workflows.
- Push/email/SMS notifications.
- Multi-tenant support for multiple campuses or municipalities.
- Mobile app companion for field staff.
- Advanced fraud detection using historical complaint patterns.

## Author

**Rahul Saini**  
Computer Engineering Student  
GitHub: [@RahulSainii](https://github.com/RahulSainii)

## License

This project is currently intended for hackathon and academic evaluation. Add a license before using it in production or distributing it publicly.
