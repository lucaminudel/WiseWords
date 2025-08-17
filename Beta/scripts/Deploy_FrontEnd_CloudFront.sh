#!/bin/bash

# Configuration
BUCKET_NAME="wisewords-frontend"
REGION="eu-west-2"
PROFILE="deploy-to-production-profile"
DIST_FOLDER="../WiseWords.FrontEnd/dist"

echo "🚀 Deploying WiseWords Frontend with CloudFront (HTTPS)..."
echo "Bucket: $BUCKET_NAME"
echo "Region: $REGION"

# Check if dist folder exists
if [ ! -d "$DIST_FOLDER" ]; then
    echo "❌ Error: dist folder not found at $DIST_FOLDER"
    echo "Please run 'npm run build' in the WiseWords.FrontEnd directory first"
    exit 1
fi

# Create S3 bucket (or use existing)
echo "📦 Creating S3 bucket..."
if aws s3api head-bucket --bucket $BUCKET_NAME --profile $PROFILE 2>/dev/null; then
    echo "Bucket $BUCKET_NAME already exists, using existing bucket"
else
    aws s3 mb s3://$BUCKET_NAME --region $REGION --profile $PROFILE
fi

# Upload files (no public access needed with CloudFront)
echo "📤 Uploading files..."
aws s3 sync $DIST_FOLDER s3://$BUCKET_NAME --delete --profile $PROFILE

# Create CloudFront Origin Access Control
echo "🔧 Creating CloudFront Origin Access Control..."
OAC_ID=$(aws cloudfront create-origin-access-control --origin-access-control-config '{
    "Name": "wisewords-frontend-oac",
    "Description": "OAC for WiseWords Frontend",
    "OriginAccessControlOriginType": "s3",
    "SigningBehavior": "always",
    "SigningProtocol": "sigv4"
}' --profile $PROFILE --query 'OriginAccessControl.Id' --output text)

echo "Created OAC: $OAC_ID"

# Create CloudFront distribution
echo "☁️ Creating CloudFront distribution..."
DISTRIBUTION_CONFIG='{
    "CallerReference": "'$(date +%s)'",
    "Comment": "WiseWords Frontend Distribution",
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-wisewords-frontend",
                "DomainName": "'$BUCKET_NAME'.s3.'$REGION'.amazonaws.com",
                "S3OriginConfig": {
                    "OriginAccessIdentity": ""
                },
                "OriginAccessControlId": "'$OAC_ID'"
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-wisewords-frontend",
        "ViewerProtocolPolicy": "redirect-to-https",
        "TrustedSigners": {
            "Enabled": false,
            "Quantity": 0
        },
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            }
        },
        "MinTTL": 0,
        "Compress": true
    },
    "CustomErrorResponses": {
        "Quantity": 1,
        "Items": [
            {
                "ErrorCode": 404,
                "ResponsePagePath": "/index.html",
                "ResponseCode": "200",
                "ErrorCachingMinTTL": 300
            }
        ]
    },
    "Enabled": true,
    "PriceClass": "PriceClass_100"
}'

DISTRIBUTION_ID=$(aws cloudfront create-distribution --distribution-config "$DISTRIBUTION_CONFIG" --profile $PROFILE --query 'Distribution.Id' --output text)
DOMAIN_NAME=$(aws cloudfront get-distribution --id $DISTRIBUTION_ID --profile $PROFILE --query 'Distribution.DomainName' --output text)

echo "Created CloudFront Distribution: $DISTRIBUTION_ID"

# Update S3 bucket policy to allow CloudFront access
echo "🔒 Setting S3 bucket policy for CloudFront..."
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy '{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCloudFrontServicePrincipal",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::'$BUCKET_NAME'/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": "arn:aws:cloudfront::'$(aws sts get-caller-identity --profile $PROFILE --query Account --output text)':distribution/'$DISTRIBUTION_ID'"
                }
            }
        }
    ]
}' --profile $PROFILE

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌍 HTTPS Website URL: https://$DOMAIN_NAME"
echo "📝 CloudFront Distribution ID: $DISTRIBUTION_ID"
echo "📝 S3 Bucket: $BUCKET_NAME"
echo ""
echo "⏳ Note: CloudFront deployment takes 10-15 minutes to fully propagate globally."