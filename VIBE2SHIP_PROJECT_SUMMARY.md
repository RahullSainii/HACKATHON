# Samadhaan - Vibe2Ship Project Summary

## Problem Statement Selected

Public and campus complaint systems are often slow, fragmented, and opaque. Citizens or students can report issues, but they usually do not get clear tracking, location-aware visibility, evidence-based reporting, or community validation. Administrators also lack a unified dashboard to prioritize complaints, identify hotspots, measure impact, and respond faster.

Samadhaan solves this by creating a smart, location-aware complaint management platform where users can report issues with media proof, GPS coordinates, AI-assisted categorization, community verification, and real-time status updates.

## Solution Overview

Samadhaan is a full-stack digital complaint management system for campuses, institutions, and civic bodies. Users can register, submit complaints, attach images/videos, use their current location, view nearby complaints, and verify issues reported by others. Administrators get a powerful dashboard with live updates, complaint details, impact metrics, active zones, category trends, response-time insights, and citizen contribution rankings.

The platform improves transparency, speeds up resolution, and encourages community participation through verification and gamified reputation points.

## Key Features

- User registration, login, JWT authentication, and role-based access for users/admins.
- Complaint submission with category, priority, description, anonymous reporting, and exact location.
- Image and video upload support with validation, optional compression, and storage through local uploads or AWS S3.
- GPS-based complaint reporting using latitude and longitude coordinates.
- MongoDB geospatial indexing for radius-based nearby complaint queries.
- AI-powered auto-categorization using GPT Vision when configured, with a local heuristic fallback.
- Community verification system with "I can confirm this issue" voting.
- Verified complaint badges after enough confirmations.
- Real-time updates using Socket.io for new complaints, status changes, and verification events.
- Admin impact dashboard with resolved-this-month count, verified issue count, impact score, category breakdown, response-time trend, active zones, and leaderboard.
- Gamification with reputation points, badges, contribution counts, verification counts, and streak tracking.
- CSV export for admin reporting.
- Responsive React frontend with user dashboard and admin dashboard.

## Technologies Used

### Frontend

- React
- TypeScript
- Vite
- Material UI
- Recharts
- Lucide React icons
- Axios
- Socket.io Client
- Browser Geolocation API

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT authentication
- bcryptjs password hashing
- Multer for multipart file uploads
- Sharp for image compression
- Socket.io for real-time communication
- Express Validator
- CORS

### Storage and Media

- Local file upload fallback for development
- AWS S3 compatible upload support for production
- Image and video validation
- Compressed image storage when Sharp is available

### AI and Intelligence

- OpenAI GPT Vision compatible categorization through `OPENAI_API_KEY`
- Local keyword-based category fallback when no AI key is configured
- Fraud/spam/duplicate complaint screening

### Database

- MongoDB collections for users and complaints
- GeoJSON coordinate storage
- 2dsphere geospatial index for nearby complaint search
- Indexed complaint queries for dashboard performance

## Google Technologies Utilized

- Google Maps coordinate links for opening reported GPS locations directly in Maps.
- Browser Geolocation API support for "Use Current Location" reporting.
- The system is designed so Google Maps Platform can be added for richer map rendering, directions, and pin visualization by configuring a Google Maps API key.

Note: The current implementation uses GPS coordinates and map links without requiring a paid Google Maps API key. For a Google-focused hackathon submission, the next recommended enhancement is replacing the lightweight map/link experience with Google Maps JavaScript API pins and heatmaps.

## Deployment Readiness

The application is ready for deployment after environment variables are configured on the hosting platforms.

### Backend Required Environment Variables

```env
NODE_ENV=production
PORT=5000
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=your_secure_access_token_secret
JWT_REFRESH_SECRET=your_secure_refresh_token_secret
CLIENT_URL=https://your-frontend-domain
CLIENT_URLS=https://your-frontend-domain
```

### Optional Production Environment Variables

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_VISION_MODEL=gpt-4o-mini
AWS_REGION=your_aws_region
AWS_S3_BUCKET=your_s3_bucket
AWS_S3_PUBLIC_BASE_URL=your_public_bucket_base_url
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_SECURE=false
EMAIL_FROM=no-reply@samadhaan.local
```

### Recommended Deployment Platforms

- Backend: Render, Railway, or any Node.js hosting platform.
- Frontend: Vercel or Netlify.
- Database: MongoDB Atlas.
- Media Storage: AWS S3 for production uploads.

## Project Impact

Samadhaan turns complaint reporting from a passive ticketing process into an active community resolution system. It improves trust through transparent tracking, improves administrator efficiency through analytics, and increases citizen participation through verification and gamification.
