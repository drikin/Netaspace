#!/bin/bash

# Make all scripts executable

echo "Adding execute permissions to all scripts..."

chmod +x scripts/*.sh

echo "Execute permissions added to:"
ls -la scripts/*.sh

echo "Done!"