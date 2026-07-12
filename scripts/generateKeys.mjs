import { spawnSync } from "node:child_process";
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const keys = await generateKeyPair("RS256", {
  extractable: true,
});
const privateKey = privateKeyOneLine(await exportPKCS8(keys.privateKey));
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

function privateKeyOneLine(key) {
  return key.trimEnd().replace(/\n/g, " ");
}

const shouldApply = process.argv.includes("--apply");
const useProd = process.argv.includes("--prod");

function convexEnvArgs(name) {
  const args = ["convex", "env", "set", name, "--force"];
  if (useProd) {
    args.push("--prod");
  }
  return args;
}

function setConvexEnv(name, value) {
  const useAnonymous =
    !useProd && (process.env.CONVEX_AGENT_MODE ?? "anonymous") === "anonymous";

  const result = spawnSync("npx", convexEnvArgs(name), {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...(useAnonymous ? { CONVEX_AGENT_MODE: "anonymous" } : {}),
    },
    input: value,
    encoding: "utf8",
    stdio: ["pipe", "inherit", "inherit"],
  });

  if (result.status !== 0) {
    throw new Error(`Failed to set Convex env var ${name}`);
  }
}

if (shouldApply) {
  console.log(
    `Setting Convex Auth environment variables${useProd ? " (production)" : ""}...`,
  );
  setConvexEnv("JWT_PRIVATE_KEY", privateKey);
  setConvexEnv("JWKS", jwks);
  console.log("Done. Restart `npm run dev` if it is already running.");
} else {
  console.log("Run this to configure Convex Auth automatically:\n");
  console.log("  npm run setup-auth          # local anonymous dev");
  console.log("  npm run setup-auth:prod     # production deployment\n");
  console.log("Or manually pipe values:");
  console.log(`  printf '%s' ${JSON.stringify(privateKey)} | npx convex env set JWT_PRIVATE_KEY --force`);
  console.log(`  printf '%s' ${JSON.stringify(jwks)} | npx convex env set JWKS --force`);
}
