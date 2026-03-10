import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware } from "@/middleware/auth";
import emailRoutes from "@/routes/emails";
import healthRoutes from "@/routes/health";
import { ERR } from "@/utils/http";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// CORS
app.use("*", cors());

// Health check (no auth)
app.route("/", healthRoutes);

// Auth middleware for all /api/emails routes
app.use("/api/emails/*", authMiddleware);
app.use("/api/emails", authMiddleware);

// Email routes
app.route("/", emailRoutes);

// 404
app.notFound((c) => {
	return c.json(ERR("NOT_FOUND", "Route not found"), 404);
});

// Error handler
app.onError((err, c) => {
	console.error(`Unhandled error: ${err.message}`, err);
	return c.json(ERR("INTERNAL_ERROR", err.message), 500);
});

export default app;
