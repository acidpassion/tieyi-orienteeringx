# OrienteeringX Backend Deployment Guide for Aliyun

## Problem Analysis
The nginx error indicates that the backend Node.js server is not running on port 5001. The configuration is correct, but the server needs to be started on the Aliyun server.

## Prerequisites
- Node.js installed on Aliyun server
- MongoDB running (local or cloud)
- Nginx configured as reverse proxy

## Deployment Steps

### 1. Upload Backend Code to Aliyun Server
```bash
# On your local machine, create a deployment package
cd /Users/alex/dev/orienteering_quiz_app/backend
tar -czf backend.tar.gz .

# Upload to Aliyun server
scp backend.tar.gz user@your-server:/opt/orienteeringx/
```

### 2. Setup on Aliyun Server
```bash
# SSH to your Aliyun server
ssh user@your-server

# Create application directory
sudo mkdir -p /opt/orienteeringx
cd /opt/orienteeringx

# Extract backend code
sudo tar -xzf backend.tar.gz
sudo chown -R $USER:$USER /opt/orienteeringx

# Install dependencies
npm install --production
```

### 3. Configure Environment Variables
```bash
# Create production .env file
cat > /opt/orienteeringx/.env << EOF
MONGODB_URI=mongodb://localhost:27017/orienteeringx
JWT_SECRET=sDJAReIyExW57BSR
PORT=5001
NODE_ENV=production
EOF
```

### 4. Create Systemd Service
```bash
# Create service file
sudo tee /etc/systemd/system/orienteeringx.service << EOF
[Unit]
Description=OrienteeringX Backend API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/orienteeringx
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10
KillMode=process

# Logging
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=orienteeringx

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable orienteeringx
sudo systemctl start orienteeringx
```

### 5. Verify Service Status
```bash
# Check service status
sudo systemctl status orienteeringx

# Check if port 5001 is listening
sudo netstat -tlnp | grep :5001
# or
sudo ss -tlnp | grep :5001

# Check logs
sudo journalctl -u orienteeringx -f
```

### 6. Test Backend API
```bash
# Test health endpoint
curl http://localhost:5001/health

# Test students API
curl http://localhost:5001/api/students/all
```

## Troubleshooting Commands

### Check if Backend is Running
```bash
# Check process
ps aux | grep node

# Check port
sudo lsof -i :5001

# Check service logs
sudo journalctl -u orienteeringx --no-pager -l
```

### Restart Backend Service
```bash
sudo systemctl restart orienteeringx
sudo systemctl status orienteeringx
```

### Check MongoDB Connection
```bash
# Test MongoDB connection
mongo --eval "db.adminCommand('ismaster')"
```

### Manual Start (for debugging)
```bash
# Stop systemd service first
sudo systemctl stop orienteeringx

# Start manually to see errors
cd /opt/orienteeringx
node server.js
```

## Nginx Configuration
Ensure your nginx configuration has:
```nginx
upstream backend {
    server 127.0.0.1:5001;
}

server {
    listen 80;
    server_name api.orienteeringx.cn;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Quick Fix Commands
```bash
# 1. Check if service is running
sudo systemctl status orienteeringx

# 2. If not running, start it
sudo systemctl start orienteeringx

# 3. If fails to start, check logs
sudo journalctl -u orienteeringx -n 50

# 4. Test the API
curl http://localhost:5001/health
```

## Common Issues

1. **Port already in use**: Kill existing process or change port
2. **Permission denied**: Check file permissions and user
3. **MongoDB connection failed**: Verify MongoDB is running
4. **Module not found**: Run `npm install` in backend directory
5. **Environment variables**: Check .env file exists and has correct values

## Production Considerations

1. **Use PM2 for process management** (alternative to systemd):
```bash
npm install -g pm2
pm2 start server.js --name orienteeringx
pm2 startup
pm2 save
```

2. **Setup log rotation**
3. **Configure firewall** to allow port 5001 internally
4. **Setup monitoring** and health checks
5. **Use environment-specific configurations**

After following these steps, your backend should be running on port 5001 and nginx should be able to connect to it successfully.