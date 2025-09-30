#!/bin/bash
set -euo pipefail

# Configuration
BUCKET_NAME="wisewords-frontend"
REGION="eu-west-2"
PROFILE="deploy-to-production-profile"
DIST_FOLDER="../WiseWords.FrontEnd/dist-prod"

echo -e "\033[33m🚀 Deploying WiseWords Frontend to S3...\033[0m"
echo "Bucket: $BUCKET_NAME"
echo "Region: $REGION"

# Build frontend with production environment
echo -e "\033[33m🔨 Building frontend for production...\033[0m"
cd ../WiseWords.FrontEnd
export WISEWORDS_ENV=aws_prod
if ! npm run build:prod; then
    echo "❌ Build failed, aborting deployment"
    exit 1
fi
cd ../scripts

# Check if dist folder exists
if [ ! -d "$DIST_FOLDER" ]; then
    echo "❌ Error: dist folder not found at $DIST_FOLDER"
    echo "Build may have failed"
    exit 1
fi

# Ensure S3 bucket exists (private bucket behind CloudFront OAI)
echo -e "\033[33m📦 Ensuring S3 bucket exists...\033[0m"
if aws s3api head-bucket --bucket "$BUCKET_NAME" --profile "$PROFILE" 2>/dev/null; then
    echo "Bucket $BUCKET_NAME already exists"
else
    aws s3 mb "s3://$BUCKET_NAME" --region "$REGION" --profile "$PROFILE"
fi

# Upload files with correct caching
echo -e "\033[33m📤 Uploading files with optimal caching...\033[0m"
# 1) Sync all assets except index.html with long-lived, immutable caching
aws s3 sync "$DIST_FOLDER/" "s3://$BUCKET_NAME/" \
  --delete \
  --exclude "index.html" \
  --cache-control "public, max-age=31536000, immutable" \
  --profile "$PROFILE" \
  --region "$REGION"

# 2) Upload index.html separately with no-cache
aws s3 cp "$DIST_FOLDER/index.html" "s3://$BUCKET_NAME/index.html" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --profile "$PROFILE" \
  --region "$REGION"

# CloudFront invalidation (narrow scope to index and root only)
DISTRIBUTION_ID=$(aws cloudfront list-distributions --profile "$PROFILE" --query 'DistributionList.Items[?Comment==`WiseWords Frontend Distribution`].Id' --output text 2>/dev/null || true)

if [ -n "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
    echo "☁️ CloudFront distribution found: $DISTRIBUTION_ID"
    echo "🔄 Creating CloudFront invalidation for / and /index.html ..."
    aws cloudfront create-invalidation \
      --distribution-id "$DISTRIBUTION_ID" \
      --paths "/" "/index.html" \
      --profile "$PROFILE" \
      --region "$REGION" > /dev/null
else
    echo "❌ No CloudFront distribution found with Comment 'WiseWords Frontend Distribution'."
    echo "This script assumes a private S3 bucket behind CloudFront (OAI)."
    echo "Please create/configure the CloudFront distribution or update the comment to match."
    exit 1
fi

# Fetch and show the CloudFront HTTPS domain
CLOUDFRONT_DOMAIN=$(aws cloudfront get-distribution \
  --id "$DISTRIBUTION_ID" \
  --query 'Distribution.DomainName' \
  --output text \
  --profile "$PROFILE" 2>/dev/null || true)

if [ -n "$CLOUDFRONT_DOMAIN" ] && [ "$CLOUDFRONT_DOMAIN" != "None" ]; then
  echo ""
  echo "🌍 HTTPS Website URL: https://$CLOUDFRONT_DOMAIN"
fi

echo ""
echo -e "\033[33m✅ Deployment complete!\033[0m"
