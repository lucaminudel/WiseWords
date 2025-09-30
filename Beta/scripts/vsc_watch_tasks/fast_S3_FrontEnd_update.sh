#!/bin/bash
# This script performs the S3 sync and CloudFront invalidation.
set -euo pipefail

clear
echo -e "\033[0;32m--- S3 sync triggered at $(date) ---\033[0m"

BUCKET="wisewords-frontend"
PREFIX=""
DIST_ID=""
AWS_PROFILE="deploy-to-production-profile"
AWS_REGION="eu-west-2"

if [ -n "$PREFIX" ]; then
  S3_TARGET="$BUCKET/$PREFIX/"
  CLOUDFRONT_PATH="/$PREFIX/index.html"
else
  S3_TARGET="$BUCKET/"
  CLOUDFRONT_PATH="/index.html"
fi

echo "Syncing dist-prod/ -> s3://$S3_TARGET"

aws s3 sync dist-prod/ s3://"$S3_TARGET" --delete \
  --cache-control "public, max-age=31536000, immutable" --exclude "index.html" \
  --profile "$AWS_PROFILE" --region "$AWS_REGION"

aws s3 cp dist-prod/index.html s3://"$S3_TARGET"index.html \
  --cache-control "no-cache, no-store, must-revalidate" --profile "$AWS_PROFILE" --region "$AWS_REGION"

if [ -z "$DIST_ID" ]; then
  DIST_ID=$(aws cloudfront list-distributions --profile "$AWS_PROFILE" --query "DistributionList.Items[?Comment=='WiseWords Frontend Distribution'].Id" --output text --region "$AWS_REGION" 2>/dev/null || true)
fi

if [ -n "$DIST_ID" ] && [ "$DIST_ID" != "None" ]; then
  echo "Creating CloudFront invalidation for / and $CLOUDFRONT_PATH on $DIST_ID"
  aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/" "$CLOUDFRONT_PATH" --profile "$AWS_PROFILE" --region "$AWS_REGION"
else
  echo "No CloudFront distribution found or configured — skipping invalidation"
fi

echo -e "Sync + (optional) invalidation completed. Ready to watch for next change."
