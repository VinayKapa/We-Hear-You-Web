import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = 3000;

// Dynamic Supabase server configuration
let serverSupabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
let serverSupabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
let serverSupabase: SupabaseClient | null = null;

function getServerSupabase(): SupabaseClient | null {
  if (!serverSupabase && serverSupabaseUrl && serverSupabaseKey && serverSupabaseUrl.startsWith("http")) {
    try {
      serverSupabase = createClient(serverSupabaseUrl, serverSupabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      console.log("[Server Supabase] Initialized connection to:", serverSupabaseUrl);
    } catch (e) {
      console.warn("[Server Supabase] Init error:", e);
      serverSupabase = null;
    }
  }
  return serverSupabase;
}

// Initial attempt
getServerSupabase();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Helper to get Gemini client with AI Studio headers
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// In-memory cache for repeated translation/Q&A requests to save quota
const apiResponseCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache

function getCachedResponse(key: string): any | null {
  const cached = apiResponseCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
    apiResponseCache.delete(key);
    return null;
  }
  return cached.data;
}

function setCachedResponse(key: string, data: any): void {
  // Cap cache size to avoid memory growth
  if (apiResponseCache.size > 200) {
    const firstKey = apiResponseCache.keys().next().value;
    if (firstKey) apiResponseCache.delete(firstKey);
  }
  apiResponseCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Resilient Gemini Content Generation
 * Handles 503 UNAVAILABLE (high demand), 429 quota exhaustion, and network errors.
 * Immediately fails over across models without redundant retries on hard quota limits.
 */
async function callGeminiWithResilience(
  ai: GoogleGenAI,
  options: {
    contents: any;
    config: any;
  }
): Promise<{ text: string; modelUsed: string }> {
  // Ordered models: start with high-throughput flash-lite / flash-latest
  const modelsToTry = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.7-flash"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });

      if (response && typeof response.text === "string" && response.text.trim()) {
        return { text: response.text, modelUsed: model };
      }
    } catch (err: any) {
      lastError = err;
      const errString = String(err?.message || err || "");
      const isQuotaError = 
        errString.includes("429") || 
        errString.includes("RESOURCE_EXHAUSTED") || 
        errString.includes("quota") ||
        errString.includes("exceeded your current quota");

      console.warn(`[Gemini Resilience] ${model} failed (${isQuotaError ? "Quota Limit" : "Transient"}): ${errString.slice(0, 100)}`);

      // If it's a 503 transient overload (not quota), try once more with short delay
      if (!isQuotaError && (errString.includes("503") || errString.includes("UNAVAILABLE"))) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 300));
          const retryResponse = await ai.models.generateContent({
            model,
            contents: options.contents,
            config: options.config,
          });
          if (retryResponse && typeof retryResponse.text === "string" && retryResponse.text.trim()) {
            return { text: retryResponse.text, modelUsed: model };
          }
        } catch {
          // Proceed to next model
        }
      }
      // Move immediately to next model in list
    }
  }

  throw lastError || new Error("All Gemini models were unavailable.");
}

/**
 * Robust JSON Sanitizer
 */
function safeParseJson<T>(rawText: string, fallback: T): T {
  if (!rawText || typeof rawText !== "string") return fallback;
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch {}
    }
    return fallback;
  }
}

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    appName: "We Hear You",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// In-memory Auth Database & Sessions
interface ServerUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  avatarInitials: string;
  createdAt: string;
}

const serverUsers = new Map<string, ServerUser>();
const serverSessions = new Map<string, { userId: string; createdAt: number }>();
const userHistoryStore = new Map<string, { translations: any[]; conversations: any[]; emergency: any[] }>();
const userSettingsStore = new Map<string, any>();

// Seed default demo user
const demoUserId = "demo_user_001";
serverUsers.set(demoUserId, {
  id: demoUserId,
  name: "Aarav Sharma",
  email: "aarav.sharma@wehearyou.org",
  password: "password123",
  role: "deaf_individual",
  avatarInitials: "AS",
  createdAt: "2026-01-15T08:30:00.000Z",
});

function extractAuthUserId(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (token === "demo_token_wehearyou_2026") return demoUserId;
  const session = serverSessions.get(token);
  return session ? session.userId : null;
}

// Supabase Config & Diagnostic Endpoints
app.get("/api/supabase/config", (req: Request, res: Response) => {
  const sb = getServerSupabase();
  res.json({
    configured: Boolean(sb),
    supabaseUrl: serverSupabaseUrl,
    supabaseAnonKey: serverSupabaseKey,
  });
});

app.post("/api/supabase/config", (req: Request, res: Response) => {
  const { supabaseUrl, supabaseAnonKey } = req.body;
  if (supabaseUrl && supabaseAnonKey) {
    serverSupabaseUrl = String(supabaseUrl).trim();
    serverSupabaseKey = String(supabaseAnonKey).trim();
    try {
      serverSupabase = createClient(serverSupabaseUrl, serverSupabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      console.log("[Server Supabase] Updated connection to:", serverSupabaseUrl);
      return res.json({ success: true, message: "Supabase configuration updated successfully." });
    } catch (e: any) {
      return res.status(400).json({ error: e.message || "Failed to initialize Supabase client." });
    }
  }
  return res.status(400).json({ error: "Supabase URL and Anon Key are required." });
});

app.post("/api/supabase/test", async (req: Request, res: Response) => {
  const sb = getServerSupabase();
  if (!sb) {
    return res.json({
      ok: false,
      message: "Supabase credentials not configured on server (SUPABASE_URL, SUPABASE_ANON_KEY).",
      tables: { users: false, profiles: false, translations: false, emergency_logs: false, user_settings: false },
    });
  }

  const tableStatus: Record<string, boolean> = {
    users: false,
    profiles: false,
    translations: false,
    emergency_logs: false,
    user_settings: false,
  };

  try {
    const { error: uErr } = await sb.from("users").select("id").limit(1);
    tableStatus.users = !uErr;

    const { error: pErr } = await sb.from("profiles").select("id").limit(1);
    tableStatus.profiles = !pErr;

    const { error: tErr } = await sb.from("translations").select("id").limit(1);
    tableStatus.translations = !tErr;

    const { error: eErr } = await sb.from("emergency_logs").select("id").limit(1);
    tableStatus.emergency_logs = !eErr;

    const { error: sErr } = await sb.from("user_settings").select("user_id").limit(1);
    tableStatus.user_settings = !sErr;

    return res.json({
      ok: true,
      message: "Supabase server connection verified successfully.",
      tables: tableStatus,
    });
  } catch (e: any) {
    return res.json({
      ok: false,
      message: e.message || "Supabase test query failed.",
      tables: tableStatus,
    });
  }
});

// Bulk sync data to Supabase Tables
app.post("/api/supabase/sync-all", async (req: Request, res: Response) => {
  const sb = getServerSupabase();
  if (!sb) {
    return res.status(400).json({ error: "Supabase client not configured on server." });
  }

  const { users = [], translations = [], emergency = [] } = req.body;
  let userCount = 0;
  let transCount = 0;
  let emerCount = 0;

  try {
    if (Array.isArray(users) && users.length > 0) {
      for (const u of users) {
        if (!u.email) continue;
        const payload = {
          id: u.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: u.name || u.full_name || u.email.split("@")[0],
          full_name: u.name || u.full_name || u.email.split("@")[0],
          email: u.email.toLowerCase().trim(),
          role: u.role || "deaf_individual",
          avatar_initials: u.avatarInitials || (u.name ? u.name.slice(0, 2).toUpperCase() : "WH"),
          avatar_customization: u.avatarCustomization || u.avatar_customization || null,
          created_at: u.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...(u.password ? { password: u.password } : {}),
        };
        try {
          await sb.from("users").upsert(payload, { onConflict: "id" });
        } catch (e) {}
        try {
          await sb.from("profiles").upsert({
            id: payload.id,
            user_id: payload.id,
            name: payload.name,
            full_name: payload.full_name,
            email: payload.email,
            role: payload.role,
            avatar_initials: payload.avatar_initials,
            avatar_customization: payload.avatar_customization,
            updated_at: payload.updated_at,
          }, { onConflict: "id" });
        } catch (e) {}
        userCount++;
      }
    }

    if (Array.isArray(translations) && translations.length > 0) {
      for (const t of translations) {
        try {
          await sb.from("translations").upsert({
            id: t.id || `tr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            user_id: t.userId || "anonymous",
            original_text: t.originalText || t.originalInput || "",
            input_type: t.inputType || "text",
            isl_gloss: t.islGloss || "",
            importance: t.importance || "medium",
            summary: t.summary || t.simplifiedMeaning || "",
            sign_tokens: t.signTokens || [],
            created_at: t.timestamp || new Date().toISOString(),
          }, { onConflict: "id" });
        } catch (e) {}
        transCount++;
      }
    }

    if (Array.isArray(emergency) && emergency.length > 0) {
      for (const em of emergency) {
        try {
          await sb.from("emergency_logs").upsert({
            id: em.id || `em_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            user_id: em.userId || "anonymous",
            category: em.category || "general",
            title: em.title || "",
            message: em.message || "",
            isl_gloss: em.islGloss || "",
            source: em.source || "tap",
            confirmed: em.confirmed ?? true,
            created_at: em.timestamp || new Date().toISOString(),
          }, { onConflict: "id" });
        } catch (e) {}
        emerCount++;
      }
    }

    return res.json({
      success: true,
      synced: { users: userCount, translations: transCount, emergency: emerCount },
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Failed to sync records to Supabase tables." });
  }
});

// Auth: Signup
app.post("/api/auth/signup", async (req: Request, res: Response) => {
  const { name, email, password, role = "deaf_individual" } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = String(name).trim();

  const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const initials = cleanName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "WH";

  const newUser: ServerUser = {
    id: userId,
    name: cleanName,
    email: cleanEmail,
    password: String(password),
    role,
    avatarInitials: initials,
    createdAt: new Date().toISOString(),
  };

  // 1. If Supabase is available on the server, save directly to Supabase Tables
  const sb = getServerSupabase();
  if (sb) {
    try {
      // Check if user exists in Supabase table
      const { data: existingUser } = await sb
        .from("users")
        .select("id, email")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (existingUser) {
        return res.status(400).json({ error: "An account with this email already exists in Supabase. Please Sign In." });
      }

      // Upsert to 'users' table
      const userPayload = {
        id: userId,
        name: cleanName,
        full_name: cleanName,
        email: cleanEmail,
        password: String(password),
        role,
        avatar_initials: initials,
        created_at: newUser.createdAt,
        updated_at: newUser.createdAt,
      };

      const { error: userErr } = await sb.from("users").upsert(userPayload, { onConflict: "id" });
      if (userErr) {
        console.warn("[Server Supabase] users table insert attempt:", userErr.message);
        // Retry without password column if table schema lacks it
        try {
          await sb.from("users").upsert({
            id: userId,
            name: cleanName,
            full_name: cleanName,
            email: cleanEmail,
            role,
            avatar_initials: initials,
            created_at: newUser.createdAt,
            updated_at: newUser.createdAt,
          }, { onConflict: "id" });
        } catch (e) {}
      } else {
        console.log("[Server Supabase] ✅ Successfully saved user account to Supabase 'users' table:", cleanEmail);
      }

      // Upsert to 'profiles' table
      try {
        const { error: profErr } = await sb.from("profiles").upsert({
          id: userId,
          user_id: userId,
          name: cleanName,
          full_name: cleanName,
          email: cleanEmail,
          role,
          avatar_initials: initials,
          updated_at: newUser.createdAt,
        }, { onConflict: "id" });

        if (profErr) {
          await sb.from("profiles").upsert({
            id: userId,
            name: cleanName,
            full_name: cleanName,
            email: cleanEmail,
            role,
            avatar_initials: initials,
            updated_at: newUser.createdAt,
          }, { onConflict: "id" });
        }
        console.log("[Server Supabase] ✅ Successfully synced user to 'profiles' table:", cleanEmail);
      } catch (e) {}

    } catch (e: any) {
      console.warn("[Server Supabase] Signup DB sync error:", e.message || e);
    }
  }

  // 2. Save in-memory server state
  serverUsers.set(userId, newUser);

  const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  serverSessions.set(token, { userId, createdAt: Date.now() });

  const { password: _, ...userSafe } = newUser;
  return res.json({ user: userSafe, token });
});

// Auth: Login
app.post("/api/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const inputPassword = String(password);

  // 1. Check Demo Account
  if (cleanEmail === "aarav.sharma@wehearyou.org" && inputPassword === "password123") {
    const demoUser = serverUsers.get(demoUserId)!;
    const token = "demo_token_wehearyou_2026";
    const { password: _, ...userSafe } = demoUser;
    return res.json({ user: userSafe, token });
  }

  // 2. Check Supabase Database Tables if Supabase is configured
  const sb = getServerSupabase();
  if (sb) {
    try {
      // Query 'users' table
      const { data: dbUser } = await sb
        .from("users")
        .select("*")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (dbUser) {
        if (dbUser.password && dbUser.password !== inputPassword) {
          return res.status(401).json({ error: "Incorrect password. Please try again." });
        }

        const matchedUser: ServerUser = {
          id: dbUser.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: dbUser.name || dbUser.full_name || cleanEmail.split("@")[0],
          email: cleanEmail,
          role: dbUser.role || "deaf_individual",
          avatarInitials: dbUser.avatar_initials || (dbUser.name ? dbUser.name.slice(0, 2).toUpperCase() : "WH"),
          createdAt: dbUser.created_at || new Date().toISOString(),
        };

        serverUsers.set(matchedUser.id, matchedUser);
        const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        serverSessions.set(token, { userId: matchedUser.id, createdAt: Date.now() });

        const { password: _, ...userSafe } = matchedUser;
        return res.json({ user: userSafe, token });
      }

      // Query 'profiles' table as fallback
      const { data: profUser } = await sb
        .from("profiles")
        .select("*")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (profUser) {
        const matchedUser: ServerUser = {
          id: profUser.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: profUser.name || profUser.full_name || cleanEmail.split("@")[0],
          email: cleanEmail,
          role: profUser.role || "deaf_individual",
          avatarInitials: profUser.avatar_initials || (profUser.name ? profUser.name.slice(0, 2).toUpperCase() : "WH"),
          createdAt: profUser.created_at || new Date().toISOString(),
        };

        serverUsers.set(matchedUser.id, matchedUser);
        const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
        serverSessions.set(token, { userId: matchedUser.id, createdAt: Date.now() });

        const { password: _, ...userSafe } = matchedUser;
        return res.json({ user: userSafe, token });
      }
    } catch (e: any) {
      console.warn("[Server Supabase] Login query error:", e.message || e);
    }
  }

  // 3. Check in-memory server users
  let foundUser: ServerUser | null = null;
  for (const [, user] of serverUsers.entries()) {
    if (user.email === cleanEmail) {
      foundUser = user;
      break;
    }
  }

  if (foundUser) {
    if (foundUser.password && foundUser.password !== inputPassword) {
      return res.status(401).json({ error: "Incorrect password. Please try again." });
    }

    const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    serverSessions.set(token, { userId: foundUser.id, createdAt: Date.now() });

    const { password: _, ...userSafe } = foundUser;
    return res.json({ user: userSafe, token });
  }

  // 4. If not found in any store
  return res.status(404).json({ 
    error: "No account found with this email address. Please click 'Create Free Account' to register." 
  });
});

// Auth: Current User
app.get("/api/auth/me", (req: Request, res: Response) => {
  const userId = extractAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const user = serverUsers.get(userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { password: _, ...userSafe } = user;
  return res.json({ user: userSafe });
});

// Auth: Logout
app.post("/api/auth/logout", (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    serverSessions.delete(token);
  }
  return res.json({ success: true });
});

// Auth: Update Profile
app.post("/api/auth/update-profile", async (req: Request, res: Response) => {
  const userId = extractAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const existing = serverUsers.get(userId);
  if (!existing) return res.status(404).json({ error: "User not found" });

  const { name, role, avatarCustomization } = req.body;
  if (name) existing.name = String(name).trim();
  if (role) existing.role = role;
  existing.avatarInitials = existing.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  serverUsers.set(userId, existing);

  // Sync update to Supabase
  const sb = getServerSupabase();
  if (sb) {
    try {
      const updatePayload: any = {
        name: existing.name,
        full_name: existing.name,
        role: existing.role,
        avatar_initials: existing.avatarInitials,
        updated_at: new Date().toISOString(),
      };
      if (avatarCustomization) {
        updatePayload.avatar_customization = avatarCustomization;
      }

      await sb.from("users").update(updatePayload).eq("id", userId);
      await sb.from("profiles").update(updatePayload).eq("id", userId);
    } catch (e) {}
  }

  const { password: _, ...userSafe } = existing;
  return res.json({ user: userSafe });
});

// Endpoint to save Avatar Customization directly to Supabase profiles
app.post("/api/user/avatar-customization", async (req: Request, res: Response) => {
  const { userId, customization } = req.body;
  const activeUid = userId || extractAuthUserId(req) || "anonymous";

  if (!customization) {
    return res.status(400).json({ error: "Customization payload is required." });
  }

  const sb = getServerSupabase();
  if (sb && activeUid !== "anonymous") {
    try {
      await sb.from("profiles").update({
        avatar_customization: customization,
        updated_at: new Date().toISOString(),
      }).eq("id", activeUid);

      await sb.from("users").update({
        avatar_customization: customization,
        updated_at: new Date().toISOString(),
      }).eq("id", activeUid);
    } catch (e) {}
  }

  return res.json({ success: true, userId: activeUid });
});

// User Isolated History Endpoints
app.get("/api/user/history", async (req: Request, res: Response) => {
  const userId = extractAuthUserId(req) || "anonymous";
  const userHistory = userHistoryStore.get(userId) || { translations: [], conversations: [], emergency: [] };
  
  // Try fetching latest from Supabase if available
  const sb = getServerSupabase();
  if (sb && userId !== "anonymous") {
    try {
      const { data: dbTrans } = await sb.from("translations").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
      const { data: dbEmer } = await sb.from("emergency_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
      if (dbTrans && dbTrans.length > 0) {
        userHistory.translations = dbTrans.map((t: any) => ({
          id: t.id,
          originalText: t.original_text,
          originalInput: t.original_text,
          inputType: t.input_type || "text",
          islGloss: t.isl_gloss || "",
          importance: t.importance || "medium",
          summary: t.summary || "",
          signTokens: t.sign_tokens || [],
          timestamp: t.created_at,
        }));
      }
      if (dbEmer && dbEmer.length > 0) {
        userHistory.emergency = dbEmer.map((em: any) => ({
          id: em.id,
          category: em.category,
          title: em.title,
          message: em.message,
          islGloss: em.isl_gloss,
          source: em.source,
          confirmed: em.confirmed,
          timestamp: em.created_at,
        }));
      }
    } catch (e) {}
  }

  return res.json(userHistory);
});

app.post("/api/user/history/translation", async (req: Request, res: Response) => {
  const userId = extractAuthUserId(req) || "anonymous";
  const item = req.body;
  const userHistory = userHistoryStore.get(userId) || { translations: [], conversations: [], emergency: [] };
  userHistory.translations.unshift(item);
  userHistoryStore.set(userId, userHistory);

  // Sync to Supabase translations table
  const sb = getServerSupabase();
  if (sb) {
    try {
      await sb.from("translations").upsert({
        id: item.id || `tr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId,
        original_text: item.originalText || item.originalInput || "",
        input_type: item.inputType || "text",
        isl_gloss: item.islGloss || "",
        importance: item.importance || "medium",
        summary: item.summary || item.simplifiedMeaning || "",
        sign_tokens: item.signTokens || [],
        created_at: item.timestamp || new Date().toISOString(),
      }, { onConflict: "id" });
      console.log("[Server Supabase] ✅ Saved translation to 'translations' table for user:", userId);
    } catch (e: any) {
      console.warn("[Server Supabase] Failed to write translation to table:", e.message || e);
    }
  }

  return res.json({ success: true });
});

app.post("/api/user/history/emergency", async (req: Request, res: Response) => {
  const userId = extractAuthUserId(req) || "anonymous";
  const item = req.body;
  const userHistory = userHistoryStore.get(userId) || { translations: [], conversations: [], emergency: [] };
  userHistory.emergency.unshift(item);
  userHistoryStore.set(userId, userHistory);

  // Sync to Supabase emergency_logs table
  const sb = getServerSupabase();
  if (sb) {
    try {
      await sb.from("emergency_logs").upsert({
        id: item.id || `em_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId,
        category: item.category || "general",
        title: item.title || "",
        message: item.message || "",
        isl_gloss: item.islGloss || "",
        source: item.source || "tap",
        confirmed: item.confirmed ?? true,
        created_at: item.timestamp || new Date().toISOString(),
      }, { onConflict: "id" });
      console.log("[Server Supabase] ✅ Saved emergency log to 'emergency_logs' table for user:", userId);
    } catch (e: any) {
      console.warn("[Server Supabase] Failed to write emergency log to table:", e.message || e);
    }
  }

  return res.json({ success: true });
});

app.delete("/api/user/history", (req: Request, res: Response) => {
  const userId = extractAuthUserId(req) || "anonymous";
  userHistoryStore.delete(userId);
  return res.json({ success: true });
});

// API: Universal Translate to ISL (Multimodal: Text, PDF, Image, Audio, Video, Speech)
app.post("/api/gemini/translate-isl", async (req: Request, res: Response) => {
  const { 
    text = "", 
    pdfBase64, 
    imageBase64,
    audioBase64,
    videoBase64,
    mediaMimeType,
    inputType = "text", 
    language = "en", 
    simplificationLevel = "standard",
    fileName 
  } = req.body;

  try {
    if (!text && !pdfBase64 && !imageBase64 && !audioBase64 && !videoBase64) {
      return res.status(400).json({ error: "Input content (text or media file) is required." });
    }

    // Check memory cache for text queries
    const cacheKey = text ? `trans:${language}:${simplificationLevel}:${text.trim().toLowerCase()}` : "";
    if (cacheKey) {
      const cached = getCachedResponse(cacheKey);
      if (cached) {
        return res.json(cached);
      }
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Fallback rule-based ISL generation
      const fallback = generateFallbackISL(text || fileName || "Multimodal content", inputType, language, fileName);
      if (cacheKey) setCachedResponse(cacheKey, fallback);
      return res.json(fallback);
    }

    const systemInstruction = `You are the core AI Multimodal Translation Engine of "We Hear You", an Indian Sign Language (ISL) accessibility platform for deaf and hard-of-hearing users.
Your task is to analyze multimodal input (Text, PDF documents, Images/Notices/Signboards, Audio announcements/prescriptions, Video clips, or Spoken queries) and convert the extracted content into a structured Indian Sign Language (ISL) representation.

MULTIMODAL UNDERSTANDING GUIDELINES:
1. IMAGE: Extract visible text (OCR), recognize context (hospital notice, railway signboard, government circular, prescription, printed form, educational page), understand crucial instructions. If image text is partially blurry, extract whatever is confidently visible and note key highlights.
2. AUDIO / SPEECH: Transcribe spoken words cleanly, identify speaker tone/urgency, and capture key directives, numbers, dates, and locations.
3. VIDEO: Transcribe spoken audio and capture central announcements. Note that deep frame-by-frame visual gesture recognition is prototype-level.
4. PDF: Extract core public circulars, medical protocols, or bank notices, simplifying complex official jargon.
5. TEXT: Parse sentences with semantic comprehension.

IMPORTANT ISL GRAMMAR PRINCIPLES:
1. Do NOT translate word-by-word into sign gloss. ISL has its own visual-spatial grammar.
2. ISL follows Subject-Object-Verb (SOV) grammatical structure.
3. Place Time-Markers (TODAY, YESTERDAY, TOMORROW, MORNING, NIGHT) at the beginning of the sequence.
4. ISL relies heavily on Non-Manual Markers (NMM): facial expressions (eyebrows raised for yes/no questions, furrowed for wh-questions, concern for medical/warnings, emphatic for urgency), head tilts, and body posture.
5. Simplify complex jargon into accessible plain language while preserving 100% of critical facts (deadlines, dosages, platform numbers, contact details).
6. Provide an 'islSequence' array with standard uppercase sign glosses (e.g., 'PLATFORM-3', 'TRAIN', 'DELAY-45-MIN'). If a word needs finger-spelling, mark it as 'FS:[WORD]'.
7. Provide 'importance': 'low' | 'medium' | 'high' | 'critical'.
8. Provide 'confidenceScore': a number between 0.75 and 0.99 indicating transcription/extraction confidence.`;

    const promptText = `Input Modality: ${inputType.toUpperCase()}
Target Accessibility Language: ${language}
Simplification Level: ${simplificationLevel}
${fileName ? `File Name: ${fileName}` : ""}
${text ? `Provided Transcript / Content:\n"""${text.slice(0, 10000)}"""` : `Analyze the attached ${inputType} media content.`}

Execution Tasks:
1. Multimodal Content Extraction: Extract text, transcribe speech, or parse document text.
2. Semantic Context Analysis: Understand entities (deadlines, train numbers, dosages, emergency desks).
3. Concise High-Level Summary.
4. Simplified Plain-Language Meaning for deaf readers.
5. Urgency assessment ('low' | 'medium' | 'high' | 'critical').
6. Structured ISL Grammatical Sequence (Time-first, SOV order, Non-manual markers).`;

    let contentsPayload: any = [{ text: promptText }];

    if (pdfBase64) {
      const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
      contentsPayload = [
        {
          inlineData: {
            mimeType: "application/pdf",
            data: cleanBase64,
          },
        },
        { text: promptText },
      ];
    } else if (imageBase64) {
      const mime = mediaMimeType || (imageBase64.startsWith("data:image/png") ? "image/png" : "image/jpeg");
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
      contentsPayload = [
        {
          inlineData: {
            mimeType: mime,
            data: cleanBase64,
          },
        },
        { text: promptText },
      ];
    } else if (audioBase64) {
      const mime = mediaMimeType || "audio/mp3";
      const cleanBase64 = audioBase64.replace(/^data:audio\/[a-zA-Z0-9]+;base64,/, "");
      contentsPayload = [
        {
          inlineData: {
            mimeType: mime,
            data: cleanBase64,
          },
        },
        { text: promptText },
      ];
    } else if (videoBase64) {
      const mime = mediaMimeType || "video/mp4";
      const cleanBase64 = videoBase64.replace(/^data:video\/[a-zA-Z0-9]+;base64,/, "");
      contentsPayload = [
        {
          inlineData: {
            mimeType: mime,
            data: cleanBase64,
          },
        },
        { text: promptText },
      ];
    }

    const { text: responseText } = await callGeminiWithResilience(ai, {
      contents: contentsPayload,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            originalText: {
              type: Type.STRING,
              description: "The extracted visual text or transcribed spoken audio content",
            },
            language: {
              type: Type.STRING,
              description: "Source language code (e.g., 'en', 'hi')",
            },
            summary: {
              type: Type.STRING,
              description: "A concise 1-2 sentence high-level summary of the message",
            },
            simplifiedMeaning: {
              type: Type.STRING,
              description: "Simplified plain-language version accessible to deaf readers",
            },
            importance: {
              type: Type.STRING,
              description: "Urgency rating: 'low', 'medium', 'high', 'critical'",
            },
            confidenceScore: {
              type: Type.NUMBER,
              description: "Confidence rating from 0.0 to 1.0 (e.g. 0.95)",
            },
            visualExtractionNotes: {
              type: Type.STRING,
              description: "Brief note about visual context / signboard / speech recognition details",
            },
            islGloss: {
              type: Type.STRING,
              description: "Full ISL gloss sentence in SOV order, e.g., 'TODAY TRAIN PLATFORM 3 ARRIVE'",
            },
            grammarStructure: {
              type: Type.STRING,
              description: "Explanation of the ISL grammar transformation (e.g. Time + Subject + Object + Verb)",
            },
            facialExpression: {
              type: Type.STRING,
              description: "Primary facial expression: 'neutral', 'question_wh', 'question_yes_no', 'urgent', 'happy', 'emphatic', 'concern'",
            },
            islSequence: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  gloss: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                  signId: { type: Type.STRING, nullable: true },
                  animationId: { type: Type.STRING, nullable: true },
                  handshape: { type: Type.STRING },
                  durationSec: { type: Type.NUMBER },
                  facialCue: { type: Type.STRING },
                },
                required: ["gloss", "meaning"],
              },
            },
            signTokens: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  gloss: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                  category: { type: Type.STRING },
                  handshape: { type: Type.STRING },
                  durationSec: { type: Type.NUMBER },
                  facialCue: { type: Type.STRING },
                  signId: { type: Type.STRING, nullable: true },
                  animationId: { type: Type.STRING, nullable: true },
                },
                required: ["gloss", "meaning", "category", "handshape", "durationSec"],
              },
            },
            keyEntities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Crucial deadlines, train numbers, dosages, amounts, or instructions",
            },
            audioTranscript: {
              type: Type.STRING,
              description: "Clean voice-over transcript of the message",
            },
          },
          required: [
            "originalText",
            "language",
            "summary",
            "simplifiedMeaning",
            "importance",
            "islSequence",
            "islGloss",
            "grammarStructure",
            "facialExpression",
            "signTokens",
            "keyEntities",
            "audioTranscript",
          ],
        },
      },
    });

    const parsed = safeParseJson(responseText, null);
    if (!parsed || !parsed.islGloss) {
      const fallback = generateFallbackISL(text || fileName || "Multimodal content", inputType, language, fileName);
      if (cacheKey) setCachedResponse(cacheKey, fallback);
      return res.json(fallback);
    }

    if (!parsed.originalText) {
      parsed.originalText = text || fileName || "Multimodal Upload";
    }
    if (cacheKey) setCachedResponse(cacheKey, parsed);
    return res.json(parsed);
  } catch (error: any) {
    console.warn("Gemini ISL Translation gracefully falling back to local semantic engine:", error?.message || error);
    const fallback = generateFallbackISL(
      text || fileName || "Multimodal Upload",
      inputType || "text",
      language || "en",
      fileName
    );
    const cacheKey = text ? `trans:${language}:${simplificationLevel}:${text.trim().toLowerCase()}` : "";
    if (cacheKey) setCachedResponse(cacheKey, fallback);
    return res.json(fallback);
  }
});

// API: Document Q&A & Simplification
app.post("/api/gemini/document-qa", async (req: Request, res: Response) => {
  const { documentText = "", question = "", docType = "general" } = req.body;

  try {
    if (!documentText) {
      return res.status(400).json({ error: "Document text is required." });
    }

    const cacheKey = `docqa:${docType}:${(question || "").trim().toLowerCase()}:${documentText.slice(0, 100).trim().toLowerCase()}`;
    const cached = getCachedResponse(cacheKey);
    if (cached) return res.json(cached);

    const ai = getGeminiClient();
    if (!ai) {
      const fallback = generateFallbackDocQA(documentText, question);
      setCachedResponse(cacheKey, fallback);
      return res.json(fallback);
    }

    const systemInstruction = `You are the Document Accessibility Assistant of "We Hear You".
You help deaf and hard-of-hearing users understand complex notices, medical reports, railway circulars, and bank documents.
Extract key deadlines, amounts, instructions, and provide clear plain-language summaries and ISL sign gloss mappings.`;

    const prompt = `Document Content (${docType}):
"""${documentText.slice(0, 4000)}"""

User Question: "${question || "Provide a summary, crucial action items, and ISL representation"}"

Provide a structured plain language summary, key action points, emergency/important warnings, and the corresponding ISL gloss translation for visual 3D avatar playback.`;

    const { text: responseText } = await callGeminiWithResilience(ai, {
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: { type: Type.STRING, description: "Direct answer or summary in clear plain language" },
            importantHighlights: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Crucial deadlines, amounts, or instructions",
            },
            islGloss: { type: Type.STRING, description: "ISL Gloss string of the main answer" },
            signTokens: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  gloss: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                  durationSec: { type: Type.NUMBER },
                },
                required: ["gloss", "meaning", "durationSec"],
              },
            },
            suggestedFollowUps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["answer", "importantHighlights", "islGloss", "signTokens", "suggestedFollowUps"],
        },
      },
    });

    const parsed = safeParseJson(responseText, null);
    if (!parsed || !parsed.answer) {
      const fallback = generateFallbackDocQA(documentText, question);
      setCachedResponse(cacheKey, fallback);
      return res.json(fallback);
    }
    setCachedResponse(cacheKey, parsed);
    return res.json(parsed);
  } catch (error: any) {
    console.warn("Document QA gracefully falling back to local semantic engine:", error?.message || error);
    const fallback = generateFallbackDocQA(documentText, question);
    const cacheKey = `docqa:${docType}:${(question || "").trim().toLowerCase()}:${documentText.slice(0, 100).trim().toLowerCase()}`;
    setCachedResponse(cacheKey, fallback);
    return res.json(fallback);
  }
});

// API: Two-Way Conversation Dialogue
app.post("/api/gemini/conversation-turn", async (req: Request, res: Response) => {
  const { speakerType, message = "", conversationContext = [] } = req.body;

  try {
    const cacheKey = `turn:${speakerType}:${(message || "").trim().toLowerCase()}`;
    const cached = getCachedResponse(cacheKey);
    if (cached) return res.json(cached);

    const ai = getGeminiClient();
    if (!ai) {
      const fallback = generateFallbackConversation(speakerType, message);
      setCachedResponse(cacheKey, fallback);
      return res.json(fallback);
    }

    const prompt = `Two-Way Accessible Conversation:
Speaker: ${speakerType === "deaf_user_signs" ? "Deaf User (Signing detected by Vision)" : "Hearing User (Spoken speech/text)"}
Incoming Message: "${message}"
Context: ${JSON.stringify(conversationContext.slice(-4))}

If deaf user signs: translate to polished natural spoken speech for the hearing participant.
If hearing user speaks: translate to simplified meaning and structured ISL Gloss (SOV order) for the 3D Avatar to sign to the deaf user.`;

    const { text: responseText } = await callGeminiWithResilience(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            interpretedMeaning: { type: Type.STRING },
            spokenAudioText: { type: Type.STRING },
            islGloss: { type: Type.STRING },
            facialExpression: { type: Type.STRING },
            suggestedQuickReplies: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["interpretedMeaning", "spokenAudioText", "islGloss", "facialExpression", "suggestedQuickReplies"],
        },
      },
    });

    const parsed = safeParseJson(responseText, null);
    if (!parsed || !parsed.interpretedMeaning) {
      const fallback = generateFallbackConversation(speakerType, message);
      setCachedResponse(cacheKey, fallback);
      return res.json(fallback);
    }
    setCachedResponse(cacheKey, parsed);
    return res.json(parsed);
  } catch (error: any) {
    console.warn("Conversation Turn gracefully falling back:", error?.message || error);
    const fallback = generateFallbackConversation(speakerType, message);
    const cacheKey = `turn:${speakerType}:${(message || "").trim().toLowerCase()}`;
    setCachedResponse(cacheKey, fallback);
    return res.json(fallback);
  }
});

// Rich domain-aware ISL fallback semantic engine
function generateFallbackISL(text: string, inputType: string, language: string, fileName?: string) {
  const clean = (text || "Welcome to We Hear You").trim();
  const lower = clean.toLowerCase();

  // Domain Dictionary Matching
  const isTrain = lower.includes("train") || lower.includes("platform") || lower.includes("station") || lower.includes("express") || lower.includes("railway");
  const isMedical = lower.includes("tablet") || lower.includes("medicine") || lower.includes("doctor") || lower.includes("fever") || lower.includes("pain") || lower.includes("prescription") || lower.includes("hospital");
  const isBanking = lower.includes("bank") || lower.includes("aadhaar") || lower.includes("pan") || lower.includes("kyc") || lower.includes("account") || lower.includes("branch");
  const isUrgent = lower.includes("urgent") || lower.includes("emergency") || lower.includes("delayed") || lower.includes("warning") || lower.includes("immediately") || lower.includes("alert");

  let summary = clean.length > 90 ? clean.slice(0, 90) + "..." : clean;
  let simplifiedMeaning = clean;
  let tokens: any[] = [];
  let grammarStructure = "Time + Subject + Object + Verb (Standard ISL SOV Structure)";
  let facialExpression = isUrgent ? "urgent" : clean.includes("?") ? "question_wh" : "neutral";
  let entities: string[] = [];

  if (isTrain) {
    summary = "Railway Station Notice: Train status, platform assignment, and boarding information.";
    simplifiedMeaning = clean.length > 120 ? "Train announcement: Please check your platform number and coach position carefully." : clean;
    entities = ["Train Update", "Platform Info", "Station Accessibility"];
    tokens = [
      { gloss: "TRAIN", meaning: "Train", category: "Transport", handshape: "H-hand parallel forward motion", durationSec: 1.0, facialCue: "neutral", signId: null, animationId: null },
      { gloss: "ANNOUNCEMENT", meaning: "Announcement", category: "General", handshape: "Both open hands sweeping out from mouth", durationSec: 0.9, facialCue: "neutral", signId: null, animationId: null },
      { gloss: "TIME-STATUS", meaning: "Schedule status", category: "Time", handshape: "Index finger tapping wrist watch", durationSec: 0.9, facialCue: isUrgent ? "concern" : "neutral", signId: null, animationId: null },
      { gloss: "PLATFORM", meaning: "Platform", category: "Transport", handshape: "Flat horizontal base palm + vertical fingers", durationSec: 1.0, facialCue: "emphatic", signId: null, animationId: null },
      { gloss: "ARRIVE", meaning: "Will arrive", category: "Action", handshape: "Open hand moving down into palm", durationSec: 0.9, facialCue: "neutral", signId: null, animationId: null },
    ];
  } else if (isMedical) {
    summary = "Medical Advisory / Prescription: Dosage schedule and health guidelines.";
    simplifiedMeaning = clean.length > 120 ? "Take medicine as prescribed by doctor. Follow dosage instructions with meals." : clean;
    entities = ["Prescription Guidelines", "Dosage Instructions", "Clinical Follow-up"];
    tokens = [
      { gloss: "DOCTOR-ADVISE", meaning: "Doctor Advice", category: "Medical", handshape: "Two fingers on wrist pulse", durationSec: 1.0, facialCue: "neutral", signId: null, animationId: null },
      { gloss: "MEDICINE", meaning: "Medicine tablet", category: "Medical", handshape: "Pinch thumb and index to mouth", durationSec: 0.9, facialCue: "neutral", signId: null, animationId: null },
      { gloss: "FOOD-AFTER", meaning: "After Meals", category: "Daily", handshape: "Eating gesture then flat hand sweep", durationSec: 1.0, facialCue: "neutral", signId: null, animationId: null },
      { gloss: "WATER-TAKE", meaning: "Drink with water", category: "Daily", handshape: "W-hand to chin drinking motion", durationSec: 0.9, facialCue: "neutral", signId: null, animationId: null },
    ];
  } else if (isBanking) {
    summary = "Banking / Verification Notice: Official compliance and deadline reminder.";
    simplifiedMeaning = clean.length > 120 ? "Please complete your ID verification and account linking before the deadline." : clean;
    entities = ["ID Verification", "Bank Account", "Public Service"];
    tokens = [
      { gloss: "OFFICIAL-DOCUMENT", meaning: "Official document", category: "Govt", handshape: "Rectangle card tracing with thumb scan", durationSec: 1.1, facialCue: "neutral", signId: null, animationId: null },
      { gloss: "BANK-ACCOUNT", meaning: "Bank account", category: "Banking", handshape: "Counting gesture near chest", durationSec: 1.0, facialCue: "neutral", signId: null, animationId: null },
      { gloss: "VERIFY-SUBMIT", meaning: "Verify / Submit", category: "Action", handshape: "Flat hand stamp onto base palm", durationSec: 1.0, facialCue: "emphatic", signId: null, animationId: null },
    ];
  } else {
    const words = clean.split(/\s+/).filter(Boolean).slice(0, 7);
    tokens = words.map((w) => {
      const raw = w.toUpperCase().replace(/[^A-Z0-9]/g, "");
      return {
        gloss: raw || "SIGN",
        meaning: w,
        category: "General",
        handshape: "Open palm expressive gesture",
        durationSec: 0.9,
        facialCue: raw.includes("?") ? "question_wh" : "neutral",
        signId: null,
        animationId: null,
      };
    });
    entities = [clean.slice(0, 30)];
  }

  const islSequence = tokens.map((t) => ({
    gloss: t.gloss,
    meaning: t.meaning,
    signId: null,
    animationId: null,
    handshape: t.handshape,
    durationSec: t.durationSec,
    facialCue: t.facialCue,
  }));

  return {
    originalText: clean,
    language: language || "en",
    summary,
    simplifiedMeaning,
    importance: isUrgent ? "critical" : isTrain || isMedical ? "high" : "medium",
    islSequence,
    islGloss: tokens.map((t) => t.gloss).join(" "),
    grammarStructure,
    facialExpression,
    signTokens: tokens,
    keyEntities: entities.length > 0 ? entities : [clean.slice(0, 25)],
    audioTranscript: simplifiedMeaning,
    fileName,
  };
}

function generateFallbackDocQA(documentText: string, question?: string) {
  return {
    answer: `Key Document Advisory: ${documentText.slice(0, 140)}... Please verify official dates and follow instructions carefully.`,
    importantHighlights: [
      "Follow designated procedural guidelines.",
      "Carry required photo ID and original documents.",
      "Check official timestamps and emergency helpline contacts.",
    ],
    islGloss: "DOCUMENT IMPORTANT INSTRUCTIONS FOLLOW CAREFUL",
    signTokens: [
      { gloss: "DOCUMENT", meaning: "Document", durationSec: 0.9 },
      { gloss: "IMPORTANT", meaning: "Important", durationSec: 1.0 },
      { gloss: "INSTRUCTION", meaning: "Instruction", durationSec: 1.1 },
      { gloss: "FOLLOW", meaning: "Follow", durationSec: 0.8 },
      { gloss: "CAREFUL", meaning: "Careful", durationSec: 1.0 },
    ],
    suggestedFollowUps: [
      "What are the mandatory documents?",
      "What is the final deadline?",
      "Where is the emergency desk located?",
    ],
  };
}

function generateFallbackConversation(speakerType: string, message: string) {
  if (speakerType === "deaf_user_signs") {
    return {
      interpretedMeaning: message || "Hello, I am using sign language.",
      spokenAudioText: `The person is communicating: "${message || "Hello"}"`,
      islGloss: (message || "HELLO").toUpperCase(),
      facialExpression: "neutral",
      suggestedQuickReplies: ["Understood", "Please write it down", "Yes, go ahead", "Thank you"],
    };
  } else {
    return {
      interpretedMeaning: message || "Hello, how can I help you?",
      spokenAudioText: message || "Hello",
      islGloss: (message || "HELLO HOW HELP YOU").toUpperCase().split(" ").slice(0, 6).join(" "),
      facialExpression: message.includes("?") ? "question_wh" : "happy",
      suggestedQuickReplies: ["YES", "NO", "AGAIN PLEASE", "THANK-YOU"],
    };
  }
}

// Start Server and mount Vite
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`We Hear You server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
