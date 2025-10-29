# Cloudflare R2 Credentials

**⚠️ IMPORTANT: Keep this file secure and DO NOT commit to Git!**

## Account Information
- **Account ID**: `2566e6fe84a59272502bdae9e2ceff41`
- **Bucket Name**: `pramara-dev`
- **Region**: `auto` (Cloudflare R2)
- **S3 Endpoint**: `https://2566e6fe84a59272502bdae9e2ceff41.r2.cloudflarestorage.com`

## API Token Details
- **Token Name**: pramara-dev-app-2 (created Oct 28, 2025)
- **Permissions**: Object Read & Write
- **Buckets**: pramara-dev
- **Status**: Active

## S3 Credentials (for .env file)
```env
S3_ACCESS_KEY_ID="c42f2d95dd853b7737416939a3a2edcf"
S3_SECRET_ACCESS_KEY="5f0c2adf2c1f3c50201568fb409580d47e72507c56a533b343dcff33e9a81210"
S3_ENDPOINT="https://2566e6fe84a59272502bdae9e2ceff41.r2.cloudflarestorage.com"
S3_BUCKET="pramara-dev"
S3_REGION="auto"
S3_FORCE_PATH_STYLE="true"
STORAGE_DRIVER=s3
```

## Token Value (Cloudflare API)
```
WuO6p1tE5j3eLqEZrouAOmbkjuOfbZFIAC5UOwKZ
```

## Usage
- Both development laptops use the same credentials
- Files uploaded from one device are accessible on the other
- No local MinIO server needed - everything is in the cloud

## Backup Location
This file should be backed up securely outside the repository:
- Personal password manager
- Encrypted backup drive
- Secure cloud storage (not GitHub)

## Created
October 28, 2025
