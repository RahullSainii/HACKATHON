# Google Cloud Run Deployment

This repository is ready to deploy as one Cloud Run service. The root `Dockerfile`
builds the React app from `frontend-new`, copies the build into the Node backend,
and serves both the frontend and API from port `8080`.

## Required Environment Variables

Set these on the Cloud Run service:

```bash
NODE_ENV=production
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_long_random_jwt_secret
```

Optional variables:

```bash
CLIENT_URL=https://your-cloud-run-url
CLIENT_URLS=https://your-cloud-run-url,https://your-custom-domain
OPENAI_API_KEY=your_openai_key
AWS_REGION=your_aws_region
AWS_S3_BUCKET=your_s3_bucket
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
```

Do not set `PORT` manually unless you know you need to. Cloud Run injects `PORT`;
the Dockerfile defaults it to `8080`, which also works locally.

## Deploy From Source

Run from the repository root:

```bash
gcloud run deploy samadhaan \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,MONGO_URI="your_mongodb_uri",JWT_SECRET="your_jwt_secret"
```

After the first deploy, test:

```bash
curl https://YOUR_SERVICE_URL/api/health
```

Expected response:

```json
{"status":"OK","message":"Samadhaan API is running"}
```

## About The Google 404 Console Messages

Requests like this are from Google/Chrome user settings, not from this app:

```text
cloudusersettings-pa.clients6.google.com/v1alpha1/settings/...
```

They can appear in DevTools while using Google Cloud Console and do not mean your
Cloud Run service is failing. Check your app URL and `/api/health` instead.

## Routing Behavior

The backend serves:

```text
/api/health        API health check
/api/auth/*        Auth API
/api/complaints/*  Complaint API
/api/profile/*     Profile API
/api/stats/*       Stats API
/api/export/*      Export API
/*                 React frontend routes
```

Unknown `/api/*` routes now return JSON 404 responses. Unknown browser routes
return the React app so refreshes on pages like `/login` or `/admin` work.
