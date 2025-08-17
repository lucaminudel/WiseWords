#!/bin/bash

# Configuration
BUCKET_NAME="wisewords-frontend"
REGION="eu-west-2"
PROFILE="deploy-to-production-profile"
DIST_FOLDER="../WiseWords.FrontEnd/dist"

echo "🚀 Deploying WiseWords Frontend to S3..."
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

# Enable static website hosting
echo "🌐 Configuring static website hosting..."
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document index.html --profile $PROFILE

# Upload files
echo "📤 Uploading files..."
aws s3 sync $DIST_FOLDER s3://$BUCKET_NAME --delete --profile $PROFILE

# Check if CloudFront distribution exists
CLOUDFRONT_DOMAIN=$(aws cloudfront list-distributions --profile $PROFILE --query 'DistributionList.Items[?Comment==`WiseWords Frontend Distribution`].DomainName' --output text 2>/dev/null)

if [ -n "$CLOUDFRONT_DOMAIN" ]; then
    echo "☁️ CloudFront distribution found: $CLOUDFRONT_DOMAIN"
    echo "🔄 Creating CloudFront invalidation..."
    DISTRIBUTION_ID=$(aws cloudfront list-distributions --profile $PROFILE --query 'DistributionList.Items[?Comment==`WiseWords Frontend Distribution`].Id' --output text)
    aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" --profile $PROFILE > /dev/null
else
    # Fallback to S3 website hosting for backward compatibility
    echo "🌐 Configuring S3 static website hosting..."
    aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document index.html --profile $PROFILE
    
    echo "🔧 Configuring public access settings..."
    aws s3api put-public-access-block --bucket $BUCKET_NAME --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" --profile $PROFILE
    
    echo "🔓 Setting public read permissions..."
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
fi

echo ""
echo "✅ Deployment complete!"
echo ""
if [ -n "$CLOUDFRONT_DOMAIN" ]; then
    echo "🌍 HTTPS Website URL: https://$CLOUDFRONT_DOMAIN"
else
    echo "🌍 HTTP Website URL: http://$BUCKET_NAME.s3-website.$REGION.amazonaws.com"
    echo "ℹ️ For HTTPS support, run: ./Deploy_FrontEnd_CloudFront.sh"
fi
echo "📝 Bucket name: $BUCKET_NAME"
echo ""
echo "Note: It may take a few minutes for the website to be accessible."