import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { DataModel } from "./_generated/dataModel";

const PasswordProvider = Password<DataModel>({
  profile(params) {
    const email = params.email as string | undefined;
    const username = params.username as string | undefined;

    if (!email?.trim()) {
      throw new ConvexError("Email is required");
    }

    if (!username?.trim()) {
      throw new ConvexError("Username is required");
    }

    const normalizedUsername = username.trim();
    if (normalizedUsername.length < 3) {
      throw new ConvexError("Username must be at least 3 characters");
    }

    const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
    const role =
      bootstrapEmail && email.trim().toLowerCase() === bootstrapEmail.toLowerCase()
        ? "admin"
        : "user";

    return {
      email: email.trim().toLowerCase(),
      name: normalizedUsername,
      username: normalizedUsername,
      role,
    };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [PasswordProvider],
});
