#!/bin/bash

# Gmail Push Notifications Setup Script
# This script sets up the necessary Cloud Pub/Sub resources for Gmail push notifications

PROJECT_ID="zero-455106"
TOPIC_NAME="gmail-notifications"
WEBHOOK_URL="https://your-domain.com/api/gmail-webhook"  # Replace with your actual domain

echo "🔔 Setting up Gmail Push Notifications for project: $PROJECT_ID"

# Set the active project
echo "Setting active project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable pubsub.googleapis.com
gcloud services enable gmail.googleapis.com

# Create the topic
echo "Creating Pub/Sub topic: $TOPIC_NAME"
gcloud pubsub topics create $TOPIC_NAME || echo "Topic may already exist"

# Create webhook subscription (replace with your actual domain)
echo "Creating webhook subscription..."
gcloud pubsub subscriptions create gmail-webhook-sub \
  --topic=$TOPIC_NAME \
  --push-endpoint=$WEBHOOK_URL || echo "Subscription may already exist"

# Grant permissions to Gmail API service account
echo "Granting permissions to Gmail API service account..."
gcloud pubsub topics add-iam-policy-binding $TOPIC_NAME \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update WEBHOOK_URL in this script with your actual domain"
echo "2. Re-run the script to update the webhook subscription"
echo "3. Add this to your .env.local:"
echo "   NEXT_PUBLIC_GMAIL_TOPIC_NAME=projects/$PROJECT_ID/topics/$TOPIC_NAME"
echo "4. Deploy your application"
echo "5. Test the Gmail push notifications"
echo ""
echo "To verify the setup:"
echo "  gcloud pubsub topics list"
echo "  gcloud pubsub subscriptions list"
echo "  gcloud pubsub topics get-iam-policy $TOPIC_NAME" 