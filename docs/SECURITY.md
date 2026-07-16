# Security Guide

> **Scope:** This guide describes the controls currently implemented in the API and deployment safeguards for production. Consult [PROJECT_STATUS.md](PROJECT_STATUS.md) for feature availability; in particular, the AI Resume Checker UI remains gated.

This document covers security best practices and deployment guidelines for the FutureTracker backend API.

## Overview

The backend implements multiple layers of security to protect against common web vulnerabilities:

- **Rate Limiting**: Prevents DoS attacks and API abuse
- **Input Validation**: Joi schemas validate all user input
- **Security Headers**: Helmet provides comprehensive HTTP security headers
- **Audit Logging**: All sensitive operations are logged
- **Data Sanitization**: Protection against NoSQL injection attacks
- **Authentication**: Clerk JWT-based authentication with user isolation

## Security Features

### 1. Rate Limiting

The current limits protect the free-tier service from accidental loops and basic abuse. They are user-aware after authentication and fall back to IP before authentication:

#### General API Endpoints
- **Limit**: 100 GET requests per minute per authenticated internal user
- **Fallback**: IP address before authentication
- **Applies to**: Protected `/api/v1/*` reads
- **Response**: HTTP 429 with clear error message and retry time

#### Write Operations
- **Limit**: 20 write operations (POST/PUT/PATCH/DELETE) per minute per authenticated internal user
- **Fallback**: IP address before authentication
- **Applies to**: Protected `/api/v1/*` mutations

**Rate Limit Error Response Example**:
```json
{
  "error": "Write Rate Limit Exceeded",
  "message": "You have made too many create/update/delete operations...",
  "retryAfter": "2026-01-16T00:42:33.000Z",
  "limit": 20,
  "window": "1 minute",
  "retryAfterSeconds": 60
}
```

### 2. Input Validation

All user input is validated using Joi schemas with the following rules:

**Opportunity Fields**:
- `title`: Required (POST), 1-200 characters, trimmed
- `description`: Optional, max 2000 characters
- `link`: Optional, valid URL (http/https), max 500 characters
- `deadline`: Optional, valid ISO date format
- `category`: Optional, enum ['internship', 'hackathon']
- `status`: Optional, enum ['applied', 'interviewed', 'shortlisted', 'selected', 'rejected']
- `notes`: Optional, max 5000 characters

**Validation Error Response Example**:
```json
{
  "error": "Validation Error",
  "message": "The request data is invalid",
  "details": [
    {
      "field": "title",
      "message": "Title is required and cannot be empty"
    },
    {
      "field": "link",
      "message": "Link must be a valid URL (http or https)"
    }
  ]
}
```

### 3. Security Headers

Enhanced Helmet configuration provides:

**Content Security Policy (CSP)**:
- Restricts resource loading to same origin
- Allows inline styles (for React)
- Blocks object and frame embedding
- Allows HTTPS images

**HTTP Strict Transport Security (HSTS)**:
- 1-year max age
- Includes subdomains
- Preload ready

**Additional Headers**:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: enabled
- Referrer-Policy: strict-origin-when-cross-origin

### 4. Audit Logging

All sensitive operations are logged in JSON format for monitoring and security analysis:

**Request Logging** (all write operations):
```json
{
  "timestamp": "2026-01-15T17:57:33.000Z",
  "type": "REQUEST",
  "method": "POST",
  "requestId": "4c4f3b7c-8d86-45be-b342-509e42a92061",
  "path": "/api/v1/opportunities",
  "ip": "192.168.1.100"
}
```

**Action Logging** (create/update/delete):
```json
{
  "timestamp": "2026-01-15T17:57:33.000Z",
  "type": "AUDIT",
  "action": "CREATE_OPPORTUNITY",
  "userId": "user_abc123",
  "resourceId": "550e8400-e29b-41d4-a716-446655440000",
  "details": {
    "category": "internship"
  }
}
```

### 5. HTTPS in Production

The backend includes HSTS headers, but **you must configure SSL/TLS termination** at the reverse proxy level.

## Production Deployment

### SSL/TLS Certificate Setup

Choose one of the following deployment scenarios:

---

#### Option 1: Nginx Reverse Proxy (Recommended)

**Step 1: Install Nginx**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# macOS
brew install nginx
```

**Step 2: Install Certbot (for Let's Encrypt)**
```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx

# macOS
brew install certbot
```

**Step 3: Obtain SSL Certificate**
```bash
# Replace example.com with your domain
sudo certbot --nginx -d api.example.com
```

**Step 4: Configure Nginx**

Create `/etc/nginx/sites-available/futuretracker-api`:
```nginx
server {
    listen 80;
    server_name api.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    # SSL certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers (additional layer)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Step 5: Enable and Test**
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/futuretracker-api /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

**Step 6: Auto-renewal**
```bash
# Certbot automatically sets up auto-renewal. Test it:
sudo certbot renew --dry-run
```

---

#### Option 2: Caddy (Easiest - Automatic HTTPS)

**Step 1: Install Caddy**
```bash
# Ubuntu/Debian
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# macOS
brew install caddy
```

**Step 2: Configure Caddy**

Create `/etc/caddy/Caddyfile`:
```
api.example.com {
    reverse_proxy localhost:3001
}
```

**Step 3: Start Caddy**
```bash
# Ubuntu/Debian
sudo systemctl restart caddy
sudo systemctl enable caddy

# macOS
caddy start
```

That's it! Caddy automatically obtains and renews SSL certificates from Let's Encrypt.

---

#### Option 3: Cloud Provider (Heroku, Railway, Render, etc.)

Most cloud platforms handle SSL/TLS automatically:

**Heroku**:
1. Deploy your app
2. SSL is automatically enabled for all apps
3. Ensure `trust proxy` is set in Express (already configured)

**Railway**:
1. Deploy your app
2. Railway provides SSL automatically on their domains
3. For custom domains, add your domain in settings

**Render**:
1. Deploy your app
2. SSL is automatic for all services
3. For custom domains, add DNS records as instructed

**AWS (EC2 + ALB)**:
1. Deploy backend to EC2
2. Create Application Load Balancer
3. Attach ACM (AWS Certificate Manager) certificate to ALB
4. Configure ALB to forward to EC2 instances

---

### Environment Variables for Production

Create a `.env` file with the following:

```bash
# Server Configuration
NODE_ENV=production
PORT=3001

# CORS - Add your production frontend URL
CORS_ORIGIN=https://your-frontend-domain.com

# Clerk Authentication
CLERK_SECRET_KEY=your_clerk_secret_key_here

# Clerk JWT Public Key (RECOMMENDED - enables networkless JWT verification)
# Prevents "TypeError: fetch failed" errors on Render/Railway/etc.
# Get from: Clerk Dashboard > Configure > API Keys > Show JWT Public Key
# Format: Use \n for newlines if your hosting doesn't support multi-line values
CLERK_JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkq...\n-----END PUBLIC KEY-----

# Supabase
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

#### CLERK_JWT_PUBLIC_KEY

This variable enables **local JWT verification** without making network calls to Clerk's JWKS endpoint on every request. Benefits:

- **Reliability**: Eliminates `TypeError: fetch failed` errors caused by network issues
- **Performance**: Faster JWT verification (no external HTTP call)
- **Resilience**: Auth works even if Clerk's JWKS endpoint is temporarily unavailable

**Accepted formats** (the middleware normalizes automatically):
1. **Multi-line PEM** - if your hosting supports multi-line environment variables
2. **Single-line with `\n` escapes** - replace actual newlines with `\n` (most common)

**Example single-line format:**
```
-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----
```

**Security Best Practices**:
- Never commit `.env` to version control
- Use environment variable management tools (e.g., Doppler, AWS Secrets Manager)
- Rotate keys regularly
- Use different keys for staging and production

---

### Running in Production

**Using PM2 (Process Manager)**:
```bash
# Install PM2
npm install -g pm2

# Start application
cd backend
pm2 start src/server.js --name futuretracker-api

# Enable startup script
pm2 startup
pm2 save

# Monitor
pm2 status
pm2 logs futuretracker-api
```

**Using systemd (Linux)**:

Create `/etc/systemd/system/futuretracker-api.service`:
```ini
[Unit]
Description=FutureTracker API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/futuretracker/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
# Start service
sudo systemctl start futuretracker-api
sudo systemctl enable futuretracker-api

# Check status
sudo systemctl status futuretracker-api
```

---

## Security Checklist

Before deploying to production, ensure:

- [ ] HTTPS is configured and working
- [ ] Environment variables are set correctly
- [ ] `.env` is in `.gitignore`
- [ ] CORS_ORIGIN is set to your frontend domain
- [ ] Supabase RLS policies are configured
- [ ] Clerk authentication is properly configured
- [ ] Rate limiting is tested and working
- [ ] Audit logs are being collected
- [ ] Server is behind a firewall (only ports 80/443 exposed)
- [ ] Regular backups are configured
- [ ] Monitoring and alerting are set up

---

## Monitoring and Maintenance

### Log Monitoring

**View audit logs**:
```bash
# If using PM2
pm2 logs futuretracker-api | grep AUDIT

# If using systemd
sudo journalctl -u futuretracker-api | grep AUDIT
```

**Monitor rate limiting**:
```bash
# Look for 429 responses
pm2 logs futuretracker-api | grep "Rate Limit"
```

### Security Updates

```bash
# Check for vulnerabilities
cd backend
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

---

## Known Limitations and Future Improvements

### Current Limitations

1. **Auth Caching**: In-memory cache resets on server restart
   - **Impact**: Minimal - cache rebuilds automatically
   - **Mitigation**: Use Redis in multi-server deployments

2. **Token Revocation**: No built-in token revocation handling
   - **Impact**: Revoked tokens still work until expiry
   - **Mitigation**: Clerk handles this at their level; tokens are short-lived

3. **Process-local controls**: Rate limits and the internal-user cache are not shared by multiple API instances
   - **Impact**: A horizontally scaled deployment can apply inconsistent limits and cache entries
   - **Mitigation**: Move hot shared state to Redis or an edge/API-gateway control once scale warrants it

### Future Security Enhancements

- [ ] Implement Redis for distributed auth caching
- [ ] Retire legacy `/api` only after the published sunset date and no known consumers remain
- [ ] Move rate limiting to a shared user/IP store for multi-instance deployment
- [ ] Add request signing for API key authentication
- [ ] Implement Web Application Firewall (WAF) rules
- [ ] Add DDoS protection (Cloudflare, AWS Shield)
- [ ] Implement anomaly detection for unusual access patterns

---

## Contact and Support

For security issues, please contact the maintainer directly rather than opening a public issue.

For general questions, refer to the main [README](../README.md) and [DOCUMENTATION](./DOCUMENTATION.md).
