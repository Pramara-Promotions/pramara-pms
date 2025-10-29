# Pramara PMS — Local Setup (Dev)

## Prereqs
- Docker Desktop
- Node.js LTS (18/20)
- Git

## Steps
1) docker compose up -d
2) cd api && npx prisma migrate deploy && cd ..
3) npm --prefix api run start
4) npm --prefix web run dev

## Env
- Copy api/.env.example -> api/.env and fill JWT_SECRET, MINIO keys.
- Copy web/.env.example -> web/.env

## MinIO CORS Setup (for Direct Browser Uploads)

If you use MinIO presigned uploads from the browser (e.g., for file/document uploads in the Files tab), you need to enable CORS on your MinIO bucket to allow PUT requests from your web origin.

### Steps to configure CORS:

1. **Access MinIO Console**
   - Open [http://localhost:9001](http://localhost:9001) (default MinIO console).
   - Login with:
     - Username: `minioadmin` (or your `MINIO_ROOT_USER` from docker-compose.yml)
     - Password: `minioadmin` (or your `MINIO_ROOT_PASSWORD`)

2. **Navigate to your bucket** (e.g., `pramara`)
   - Go to **Administrator** → **Buckets** → select `pramara` (or your bucket).
   - Click **Manage** (top-right) → **Access Rules** or **CORS Configuration**.

3. **Add CORS Rule**
   - Click **Add Rule** or **Edit CORS**.
   - Paste the following JSON:

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173", "http://localhost:4000"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

   - Adjust `AllowedOrigins` to match your frontend origin (e.g., `http://localhost:5173` for Vite dev server).
   - For production, add your deployed frontend URL (e.g., `https://your-app.com`).

4. **Save and Test**
   - Save the CORS configuration.
   - Test by uploading a file/image in the Files tab.
   - If you see CORS errors in the browser console, verify the origins match exactly (no trailing slashes).

### Alternative: mc CLI

If you prefer using the MinIO client (`mc`), run:

```sh
mc alias set local http://localhost:9000 minioadmin minioadmin
mc anonymous set-json '{"AllowedOrigins":["http://localhost:5173"],"AllowedMethods":["GET","PUT","HEAD"],"AllowedHeaders":["*"]}' local/pramara
```

### Notes
- CORS is only required when the browser makes direct requests to MinIO (presigned PUT/GET).
- If using a proxy or server-side upload only, CORS is not needed.
- For PUBLIC_FILES_BASE (public access without signed URLs), ensure the bucket/objects have the correct read policy.
