# Gmail Push Notifications Setup Guide

This guide explains how to set up Gmail push notifications using Google Cloud Pub/Sub to replace polling with real-time updates.

## Overview

Instead of polling Gmail every 2-5 minutes, this implementation uses Gmail's push notification system to receive real-time updates when new emails arrive. This is more efficient and provides instant notifications.

## Prerequisites

1. Google Cloud Project with billing enabled
2. Gmail API enabled in your project
3. Cloud Pub/Sub API enabled

## Setup Steps

### 1. Create Cloud Pub/Sub Topic

```bash
# Using gcloud CLI
gcloud pubsub topics create gmail-notifications

# Or via Cloud Console
# Go to Cloud Pub/Sub > Topics > Create Topic
# Name: gmail-notifications
```

### 2. Create Subscription

```bash
# For webhook push (recommended)
gcloud pubsub subscriptions create gmail-webhook-sub \
  --topic=gmail-notifications \
  --push-endpoint=https://yourdomain.com/api/gmail-webhook

# Or for pull subscription
gcloud pubsub subscriptions create gmail-pull-sub \
  --topic=gmail-notifications
```

### 3. Grant Permissions

Grant publish rights to Gmail API service account:

```bash
gcloud pubsub topics add-iam-policy-binding gmail-notifications \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

Or via Cloud Console:
1. Go to Cloud Pub/Sub > Topics > gmail-notifications
2. Click "PERMISSIONS" tab
3. Click "ADD PRINCIPAL"
4. Principal: `gmail-api-push@system.gserviceaccount.com`
5. Role: `Pub/Sub Publisher`

### 4. Environment Variables

Add to your `.env.local`:

```env
# Your Cloud Pub/Sub topic name (replace zero-455106 with your actual project ID)
NEXT_PUBLIC_GMAIL_TOPIC_NAME=projects/zero-455106/topics/gmail-notifications

# Optional: Webhook verification token
GMAIL_WEBHOOK_TOKEN=your-secret-token
```

### 5. Deploy Webhook Endpoint

The webhook endpoint is already created at `/api/gmail-webhook`. Make sure your application is deployed and accessible at the URL you specified in the subscription.

### 6. Test the Setup

1. Start your application
2. Sign in with Gmail
3. Navigate to the emails page
4. The system will automatically set up the watch request
5. Check the status indicator in the header (should show "Live" with green dot)

## How It Works

### 1. Watch Setup
When a user visits the emails page, the system:
- Calls Gmail API `watch` endpoint
- Registers your Pub/Sub topic for notifications
- Stores the `historyId` for tracking changes

### 2. Receiving Notifications
When Gmail detects changes:
- Sends notification to your Pub/Sub topic
- Pub/Sub delivers to your webhook endpoint
- Your app receives the notification with new `historyId`

### 3. Processing Changes
Your webhook endpoint:
- Decodes the base64-encoded notification data
- Extracts `emailAddress` and `historyId`
- Can trigger cache invalidation or real-time updates

## Implementation Details

### Files Created/Modified

1. **`/api/gmail-webhook`** - Handles incoming push notifications
2. **`/api/gmail-watch`** - Manages watch setup/teardown
3. **`useGmailNotifications` hook** - React hook for notification management
4. **Updated emails page** - Integrated push notification setup

### Key Features

- **Automatic setup**: Watch is set up automatically when viewing emails
- **Auto-renewal**: Watch is renewed every 6 days (expires in 7 days)
- **Fallback polling**: Falls back to 5-minute polling if push fails
- **Status indicator**: Shows live/manual status in the UI
- **Persistent state**: Remembers watch status across browser sessions

## Monitoring and Debugging

### Check Watch Status
```bash
# The Gmail API doesn't provide a direct way to check watch status
# Status is stored in localStorage and server logs
```

### View Pub/Sub Metrics
1. Go to Cloud Pub/Sub in Google Cloud Console
2. Select your topic/subscription
3. View delivery metrics and error rates

### Common Issues

1. **Permission denied**: Ensure Gmail service account has publisher role
2. **Webhook unreachable**: Verify your domain is accessible and HTTPS
3. **Topic not found**: Check topic name matches exactly
4. **Watch expires**: Implement auto-renewal (already included)

## Cost Considerations

- Cloud Pub/Sub pricing: ~$0.40 per million messages
- Gmail API quota: 250 quota units per user per second
- Much more cost-effective than constant polling

## Security

- Webhook endpoint validates message format
- Consider adding webhook token verification
- Use HTTPS for all endpoints
- Implement rate limiting on webhook endpoint

## Next Steps

1. Set up your Cloud Pub/Sub topic and subscription
2. Update the topic name in environment variables
3. Deploy your application
4. Test with real Gmail account
5. Monitor for successful notifications

The system will automatically handle:
- Setting up watch requests
- Renewing expired watches
- Falling back to polling if needed
- Showing status to users

This replaces the previous 2-minute polling with real-time push notifications, providing better user experience and lower resource usage. 