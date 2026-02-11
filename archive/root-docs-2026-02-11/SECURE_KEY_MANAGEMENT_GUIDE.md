# Secure Key Management - Complete Guide

## 🏗️ Architecture Overview

### Environment-Based Strategy
```
Development → .env.local (local machine)
Staging     → .env.staging (CI/CD)
Production  → .env.production (hosting platform)
```

### Key Categories
- **Public Keys**: NEXT_PUBLIC_* (client-side, limited access)
- **Server Keys**: SERVER_* (server-only, full access)
- **Secret Keys**: SECRET_* (authentication, webhooks)

## 🔧 Implementation Guide

### 1. Environment Structure

#### Development (.env.local)
```bash
# Development keys (safe to commit to .env.example)
NEXT_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dev_anon_key_placeholder
SUPABASE_SERVICE_ROLE_KEY=dev_service_key_placeholder
NEXT_PUBLIC_GA_ID=G-DEVXXXXXXXX
CRON_SECRET=dev_secret_placeholder
```

#### Production (.env.production)
```bash
# Production keys (NEVER commit)
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod_anon_key_real
SUPABASE_SERVICE_ROLE_KEY=prod_service_key_real
NEXT_PUBLIC_GA_ID=G-PRODXXXXXXXX
CRON_SECRET=prod_secret_real
```

### 2. Secure Storage Solutions

#### Option A: Hosting Platform Secrets (Recommended)
```bash
# Vercel
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Netlify
netlify env:set SUPABASE_SERVICE_ROLE_KEY "your_key"

# AWS
aws secretsmanager create-secret --name avis/production/supabase
```

#### Option B: Environment Files (Development Only)
```bash
# Secure permissions
chmod 600 .env.local
chmod 600 .env.production

# Add to .gitignore
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
echo ".env.staging" >> .gitignore
```

#### Option C: Secrets Manager (Enterprise)
```bash
# AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id avis/production

# HashiCorp Vault
vault kv get secret/avis/production

# Google Secret Manager
gcloud secrets versions access latest --secret="supabase-key"
```

### 3. Key Rotation Strategy

#### Automated Rotation Schedule
```bash
# Monthly rotation script
#!/bin/bash
# rotate-keys.sh

# Generate new keys
NEW_SERVICE_KEY=$(openssl rand -base64 32)
NEW_CRON_SECRET=$(openssl rand -base64 32)

# Update environment
echo "SUPABASE_SERVICE_ROLE_KEY=$NEW_SERVICE_KEY" > .env.production.new
echo "CRON_SECRET=$NEW_CRON_SECRET" >> .env.production.new

# Deploy with zero downtime
# (Implementation depends on hosting platform)
```

#### Manual Rotation Process
1. **Preparation**:
   - Backup current configuration
   - Schedule maintenance window
   - Prepare rollback plan

2. **Execution**:
   - Generate new keys
   - Update environment variables
   - Test all integrations
   - Deploy changes

3. **Verification**:
   - Monitor error logs
   - Test all API endpoints
   - Verify cron jobs
   - Check analytics

### 4. Access Control

#### Principle of Least Privilege
```typescript
// Example: Use minimal required keys
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Public key for user operations
);

// Admin operations only
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role for admin only
);
```

#### Role-Based Access
```typescript
// Restrict service role usage
export async function verifyAdminSession() {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  
  return user.id;
}
```

### 5. Monitoring & Auditing

#### Key Usage Monitoring
```typescript
// Log key usage (without exposing keys)
export function logApiUsage(api: string, userId?: string) {
  console.log({
    timestamp: new Date().toISOString(),
    api,
    userId: userId ? 'authenticated' : 'anonymous',
    // Never log actual keys
  });
}
```

#### Security Alerts
```bash
# Set up monitoring for:
# - Failed API calls
# - Unusual access patterns
# - Key expiration
# - Rate limit breaches
```

### 6. Development Best Practices

#### Local Development
```bash
# Use development keys only
cp .env.example .env.local
# Edit .env.local with dev keys

# Never use production keys locally
```

#### Team Collaboration
```bash
# Share keys securely
# 1. Use password manager
# 2. Use encrypted messaging
# 3. Use platform-specific secret sharing

# Never share keys via:
# - Email
# - Slack/Discord
# - Git commits
# - Plain text files
```

#### Code Reviews
```yaml
# .github/workflows/security-check.yml
name: Security Check
on: [push, pull_request]

jobs:
  check-secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check for secrets
        run: |
          # Scan for hardcoded keys
          git log --all --full-history -- **/*.ts **/*.js **/*.tsx **/*.jsx | grep -E "(sk-|SG\.|eyJ)"
```

### 7. Emergency Procedures

#### Key Compromise Response
1. **Immediate Actions**:
   - Rotate all compromised keys
   - Update all environment variables
   - Monitor for unauthorized access
   - Notify security team

2. **Investigation**:
   - Review access logs
   - Identify breach source
   - Document timeline
   - Implement additional safeguards

3. **Prevention**:
   - Improve access controls
   - Add monitoring
   - Update procedures
   - Train team

## 📋 Implementation Checklist

### Pre-Deployment
- [ ] Rotate all existing keys
- [ ] Set up environment-specific configs
- [ ] Implement access controls
- [ ] Configure monitoring
- [ ] Create emergency procedures

### Ongoing Maintenance
- [ ] Monthly key rotation
- [ ] Quarterly security audit
- [ ] Annual access review
- [ ] Regular team training
- [ ] Update documentation

### Team Training
- [ ] Security best practices
- [ ] Key handling procedures
- [ ] Emergency response
- [ ] Tool usage training
- [ ] Compliance requirements

## 🛠️ Tools & Resources

### Recommended Tools
- **Password Managers**: 1Password, Bitwarden
- **Secret Managers**: HashiCorp Vault, AWS Secrets Manager
- **Monitoring**: Datadog, New Relic
- **Scanning**: GitGuardian, TruffleHog

### Security Resources
- [OWASP Secret Management](https://owasp.org/www-project-secrets-management/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Controls](https://www.cisecurity.org/controls/)

---

**Remember**: Security is an ongoing process, not a one-time setup. Regular audits, updates, and team training are essential for maintaining secure key management.
