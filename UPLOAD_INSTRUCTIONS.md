# Direct Upload Deployment Instructions

## Step 1: Download the Bundle

Download `neta-backspace-deploy.tar.gz` from this project.

## Step 2: Upload to Server

Upload the file to your server at 153.125.147.133:

```bash
# From your local machine
scp neta-backspace-deploy.tar.gz ubuntu@153.125.147.133:~/
```

## Step 3: Extract and Deploy

SSH to your server and run:

```bash
ssh ubuntu@153.125.147.133

# Extract the bundle
tar -xzf neta-backspace-deploy.tar.gz
cd neta-backspace-deploy

# Run the deployment
chmod +x quick-deploy-from-bundle.sh
./quick-deploy-from-bundle.sh
```

This will:
- Install Node.js and PM2 if needed
- Install dependencies and build the app
- Configure database connection
- Start the app with PM2
- Configure Nginx
- Verify everything is working

## Step 4: Verify

After deployment:
- Check http://153.125.147.133
- Monitor with: `pm2 logs neta-app`

## Step 5: Setup SSL (After DNS)

Once DNS is configured:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d neta.backspace.fm
```

The bundle includes all project files and deployment scripts configured for your specific server and database.