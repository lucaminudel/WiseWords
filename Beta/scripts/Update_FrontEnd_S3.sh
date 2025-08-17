#!/bin/bash

# Configuration
PROFILE="deploy-to-production-profile"
DIST_FOLDER="../WiseWords.FrontEnd/dist"

# Set consistent bucket name
BUCKET_NAME="wisewords-frontend"

# Check if bucket exists
echo "🔍 Checking for WiseWords S3 bucket..."
if ! aws s3api head-bucket --bucket $BUCKET_NAME --profile $PROFILE 2>/dev/null; then
    echo "❌ Error: Bucket $BUCKET_NAME not found"
    echo "Please run Deploy_FrontEnd_to_S3.sh first to create the initial deployment"
    exit 1
fi



echo "🔄 Updating WiseWords Frontend on S3..."
echo "Using bucket: $BUCKET_NAME"

# Check if dist folder exists
if [ ! -d "$DIST_FOLDER" ]; then
    echo "❌ Error: dist folder not found at $DIST_FOLDER"
    echo "Please run 'npm run build' in the WiseWords.FrontEnd directory first"
    exit 1
fi

# Upload files (sync will only upload changed files)
echo "📤 Syncing files..."
aws s3 sync $DIST_FOLDER s3://$BUCKET_NAME --delete --profile $PROFILE

# Check if CloudFront distribution exists and create invalidation
CLOUDFRONT_DOMAIN=$(aws cloudfront list-distributions --profile $PROFILE --query 'DistributionList.Items[?Comment==`WiseWords Frontend Distribution`].DomainName' --output text 2>/dev/null)

if [ -n "$CLOUDFRONT_DOMAIN" ]; then
    echo "☁️ Creating CloudFront invalidation..."
    DISTRIBUTION_ID=$(aws cloudfront list-distributions --profile $PROFILE --query 'DistributionList.Items[?Comment==`WiseWords Frontend Distribution`].Id' --output text)
    aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --profile $PROFILE > /dev/null
    echo "✅ Update complete!"
    echo "🌍 HTTPS Website URL: https://$CLOUDFRONT_DOMAIN"
else
    echo "✅ Update complete!"
    echo "🌍 HTTP Website URL: http://$BUCKET_NAME.s3-website.eu-west-2.amazonaws.com"
    echo "ℹ️ For HTTPS support, run: ./Deploy_FrontEnd_CloudFront.sh"
fi