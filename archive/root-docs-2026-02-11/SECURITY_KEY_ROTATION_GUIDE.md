# Security Key Rotation Guide - EMERGENCY

## ⚠️ CRITICAL - Execute Immediately

### Step 1: Supabase Key Rotation
1. Go to Supabase Dashboard → Settings → API
2. **Rotate Service Role Key**:
   - Click "Generate new key"
   - Copy new key immediately
   - Update `.env.local` file
3. **Rotate Anon Key**:
   - Click "Generate new key"
   - Update all client references
4. **Update RLS Policies** if they reference old keys

### Step 2: Google Analytics
1. Go to Google Analytics Admin → Property Settings
2. Create new Property ID or regenerate
3. Update tracking code in application

### Step 3: CRON Secret
1. Generate new secure secret:
   ```bash
   openssl rand -base64 32
   ```
2. Update webhook endpoints
3. Update Supabase Edge Functions

### Step 4: Verify Rotation
1. Test all API endpoints
2. Verify cron jobs work
3. Check analytics tracking

## 🔒 Post-Rotation Security

### Environment Variable Security
```bash
# Set proper file permissions
chmod 600 .env.local
chmod 600 .env.production

# Add to .gitignore if not already
echo ".env.local" >> .gitignore
echo ".env.production" >> .gitignore
```

### Audit Trail
- Document rotation date
- Log who performed rotation
- Update documentation
