# Shared Serper API Key Setup

## Overview

The Shared Serper Provider allows you to offer free premium searches to your users without requiring them to have their own API keys.

## Configuration

### 1. Get a Serper API Key

1. Go to [serper.dev](https://serper.dev)
2. Sign up for an account
3. Get your API key from the dashboard

### 2. Set Environment Variable

Create or update your `.env` file in the project root:

```env
VITE_SHARED_SERPER_KEY=your_api_key_here
```

### 3. Restart Development Server

After setting the environment variable, restart your dev server:

```bash
npm run dev
```

## How It Works

### User Limits
- Each user gets **10 free searches per month**
- Usage is tracked in localStorage per user
- Automatically resets on the 1st of each month

### Provider Behavior

**With Valid API Key:**
- Provider is available and enabled
- Users can perform searches without their own API key
- Clear usage tracking and limits

**Without API Key:**
- Provider is disabled by default
- Shows clear message in UI
- Users are directed to use Free Provider or get their own key

### Error Handling

**403 Forbidden / Invalid API Key:**
```
Shared API key is invalid or expired. 
Please use a different provider or get your own API key at https://serper.dev
```

**Monthly Limit Reached:**
```
Monthly limit of 10 free searches reached. 
Resets on [date]. Get your own API key for unlimited searches.
```

## Cost Management

### Serper API Pricing
- $0.001 per search
- 2,500 free searches included
- After free tier: $5 per 5,000 searches

### Example Costs
- 100 users × 10 searches/month = 1,000 searches/month
- Cost: ~$1/month (after free tier)
- 1,000 users × 10 searches/month = 10,000 searches/month
- Cost: ~$10/month

### Recommendations

**Small Projects (< 100 users):**
- Use shared API key
- Monitor usage in Serper dashboard
- Set up billing alerts

**Medium Projects (100-1000 users):**
- Use shared API key with monitoring
- Consider increasing user limits
- Have backup plan if limits are hit

**Large Projects (> 1000 users):**
- Consider requiring users to bring their own API keys
- Or increase shared API key budget
- Implement rate limiting at application level

## Security

### API Key Protection

**DO:**
- ✅ Use environment variables
- ✅ Never commit API keys to git
- ✅ Add `.env` to `.gitignore`
- ✅ Rotate keys periodically
- ✅ Monitor usage in Serper dashboard

**DON'T:**
- ❌ Hardcode API keys in source code
- ❌ Expose keys in client-side code
- ❌ Share keys publicly
- ❌ Use same key for dev and production

### Rate Limiting

The provider includes built-in rate limiting:
- 10 searches per user per month
- Tracked in localStorage
- Automatic monthly reset

To adjust limits, modify `MONTHLY_LIMIT` in `SharedSerperProvider.ts`:

```typescript
private readonly MONTHLY_LIMIT = 10; // Change this value
```

## Monitoring

### Check Usage

1. Log in to [serper.dev](https://serper.dev)
2. Go to Dashboard
3. View usage statistics
4. Set up billing alerts

### User Feedback

Users can see their usage in the Provider Settings:
- Searches used: X/10
- Resets on: [date]
- Upgrade option available

## Troubleshooting

### Provider Not Working

**Check 1: Environment Variable**
```bash
# Verify .env file exists and contains:
VITE_SHARED_SERPER_KEY=your_key_here
```

**Check 2: Dev Server Restart**
```bash
# Stop and restart dev server
npm run dev
```

**Check 3: API Key Validity**
- Log in to serper.dev
- Verify key is active
- Check if quota is exceeded

### 403 Forbidden Error

**Causes:**
- Invalid API key
- Expired API key
- Quota exceeded
- Billing issue

**Solutions:**
1. Verify API key in serper.dev dashboard
2. Check billing status
3. Generate new API key if needed
4. Update `.env` file
5. Restart dev server

### Users Can't Search

**Check:**
1. Is provider enabled in settings?
2. Has user reached monthly limit?
3. Is API key valid?
4. Check browser console for errors

## Alternative: Disable Shared Provider

If you don't want to offer shared searches:

1. Don't set `VITE_SHARED_SERPER_KEY`
2. Provider will be disabled automatically
3. Users will use Free Provider by default
4. Or users can add their own API keys

## Production Deployment

### Environment Variables

Set the environment variable in your hosting platform:

**Vercel:**
```bash
vercel env add VITE_SHARED_SERPER_KEY
```

**Netlify:**
```bash
netlify env:set VITE_SHARED_SERPER_KEY your_key_here
```

**Docker:**
```dockerfile
ENV VITE_SHARED_SERPER_KEY=your_key_here
```

### Build Process

Ensure environment variables are available during build:

```bash
# Build with env vars
VITE_SHARED_SERPER_KEY=your_key npm run build
```

## Support

For issues with:
- **Serper API:** Contact [serper.dev/support](https://serper.dev)
- **Provider Implementation:** Check GitHub issues
- **Usage Questions:** See documentation

## Summary

The Shared Serper Provider is a great way to offer premium search to your users without requiring them to manage API keys. Just set up one shared key, and all users get 10 free premium searches per month!
