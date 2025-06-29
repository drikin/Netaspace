import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import fs from "fs";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // For Replit, build and serve static files to avoid host restrictions
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    // Build the frontend first
    console.log('Building frontend for development...');
    const { execSync } = await import('child_process');
    try {
      execSync('npm run build', { stdio: 'inherit' });
      console.log('Frontend build completed');
    } catch (error) {
      console.error('Build failed, falling back to Vite middleware');
      await setupVite(app, server);
      return;
    }
  }
  
  // Serve built files
  const distPath = path.resolve(process.cwd(), "dist", "public");
  
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    
    // Catch-all handler for SPA routing
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else {
    console.warn("Build directory not found, attempting Vite setup");
    await setupVite(app, server);
  }

  // Serve the app on configured port
  const port = parseInt(process.env.PORT || '5000');
  const host = process.env.HOST || '0.0.0.0';
  
  const listenOptions: any = { port, host };
  
  // Only use reusePort in production
  if (process.env.NODE_ENV === 'production') {
    listenOptions.reusePort = true;
  }
  
  server.listen(listenOptions, () => {
    log(`serving on ${host}:${port}`);
  });
})();
