#!/bin/bash

echo "=== Database Performance Analysis ==="
echo ""

# Check current connection count and pool status
echo "1. PostgreSQL Connection Analysis:"
netstat -an | grep :5432 | wc -l | xargs echo "Active PostgreSQL connections:"
ps aux | grep postgres | wc -l | xargs echo "PostgreSQL processes:"

# Test direct database connection speed
echo ""
echo "2. Direct Database Connection Test:"
time curl -s http://localhost:5000/api/performance | head -5

# Check recent PM2 logs for query performance
echo ""
echo "3. Recent Query Performance (from PM2 logs):"
pm2 logs neta-app --lines 20 | grep -E "(Slow query|took|ms)" | tail -10

# Test API response times
echo ""
echo "4. API Response Time Tests:"
echo "Testing /api/weeks/active..."
time curl -s -o /dev/null http://localhost:5000/api/weeks/active

echo ""
echo "Testing /api/version..."
time curl -s -o /dev/null http://localhost:5000/api/version

# Check system resources
echo ""
echo "5. System Resource Usage:"
echo "Memory usage:"
free -h | grep Mem

echo ""
echo "CPU usage:"
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//'

echo ""
echo "Disk I/O:"
iostat -x 1 1 2>/dev/null || echo "iostat not available"

# Network latency to Neon DB
echo ""
echo "6. Network Latency to Neon Database:"
ping -c 3 ep-hidden-thunder-a65mlh9x.us-west-2.aws.neon.tech 2>/dev/null | tail -1 || echo "Ping not available"

echo ""
echo "=== Recommendations ==="
echo "Based on observed slow queries (100-500ms range):"
echo "- Consider adding database indexes"
echo "- Implement query result caching"
echo "- Optimize JOIN operations"
echo "- Use connection pooling more efficiently"