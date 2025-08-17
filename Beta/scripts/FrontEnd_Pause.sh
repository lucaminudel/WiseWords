#!/bin/bash

# Configuration
BUCKET_NAME="wisewords-frontend"
PROFILE="deploy-to-production-profile"

echo "⏸️  Pausing WiseWords Frontend Website..."
echo "Bucket: $BUCKET_NAME"

# Check if CloudFront distribution exists
DISTRIBUTION_ID=$(aws cloudfront list-distributions --profile $PROFILE --query 'DistributionList.Items[?Comment==`WiseWords Frontend Distribution`].Id' --output text 2>/dev/null)

if [ -n "$DISTRIBUTION_ID" ]; then
    echo "☁️ Disabling CloudFront distribution..."
    # Get current distribution config
    aws cloudfront get-distribution-config --id $DISTRIBUTION_ID --profile $PROFILE > /tmp/dist-config.json
    ETAG=$(jq -r '.ETag' /tmp/dist-config.json)
    
    # Disable the distribution
    jq '.DistributionConfig.Enabled = false' /tmp/dist-config.json | jq '.DistributionConfig' > /tmp/dist-config-disabled.json
    aws cloudfront update-distribution --id $DISTRIBUTION_ID --distribution-config file:///tmp/dist-config-disabled.json --if-match $ETAG --profile $PROFILE > /dev/null
    
    echo "✅ CloudFront distribution disabled"
    echo "   - HTTPS website is now inaccessible"
    echo "   - Files remain in S3 (no data loss)"
    echo "   - Distribution will be disabled in 10-15 minutes"
else
    # Fallback for S3-only setup
    echo "🔒 Removing S3 public access policy..."
    aws s3api delete-bucket-policy --bucket $BUCKET_NAME --profile $PROFILE
    
    echo "✅ S3 website is now paused"
    echo "   - Files remain in S3 (no data loss)"
    echo "   - Website returns 403 Forbidden errors"
fi
echo ""
echo "To resume, run: ./Resume_FrontEnd_Website.sh"