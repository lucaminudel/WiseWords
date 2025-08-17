#!/bin/bash

# Configuration
BUCKET_NAME="wisewords-frontend"
PROFILE="deploy-to-production-profile"

echo "▶️  Resuming WiseWords Frontend Website..."
echo "Bucket: $BUCKET_NAME"

# Check if CloudFront distribution exists
DISTRIBUTION_ID=$(aws cloudfront list-distributions --profile $PROFILE --query 'DistributionList.Items[?Comment==`WiseWords Frontend Distribution`].Id' --output text 2>/dev/null)
CLOUDFRONT_DOMAIN=$(aws cloudfront list-distributions --profile $PROFILE --query 'DistributionList.Items[?Comment==`WiseWords Frontend Distribution`].DomainName' --output text 2>/dev/null)

if [ -n "$DISTRIBUTION_ID" ]; then
    echo "☁️ Re-enabling CloudFront distribution..."
    # Get current distribution config
    aws cloudfront get-distribution-config --id $DISTRIBUTION_ID --profile $PROFILE > /tmp/dist-config.json
    ETAG=$(jq -r '.ETag' /tmp/dist-config.json)
    
    # Enable the distribution
    jq '.DistributionConfig.Enabled = true' /tmp/dist-config.json | jq '.DistributionConfig' > /tmp/dist-config-enabled.json
    aws cloudfront update-distribution --id $DISTRIBUTION_ID --distribution-config file:///tmp/dist-config-enabled.json --if-match $ETAG --profile $PROFILE > /dev/null
    
    echo "✅ CloudFront distribution re-enabled"
    echo "   - HTTPS website will be accessible in 10-15 minutes"
    echo "🌍 HTTPS Website URL: https://$CLOUDFRONT_DOMAIN"
else
    # Fallback for S3-only setup
    echo "🔓 Restoring S3 public access policy..."
    aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicReadGetObject",
                "Effect": "Allow",
                "Principal": "*",
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::'$BUCKET_NAME'/*"
            }
        ]
    }' --profile $PROFILE
    
    echo "✅ S3 website is now resumed"
    echo "🌍 HTTP Website URL: http://$BUCKET_NAME.s3-website.eu-west-2.amazonaws.com"
fi