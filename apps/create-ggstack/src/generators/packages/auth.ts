import type { ProjectBuilder, StackConfig } from "../../types.js";

type SupportedAuthProvider = "better-auth" | "clerk" | "workos";

function isSupportedAuthProvider(
  provider: string,
): provider is SupportedAuthProvider {
  return ["better-auth", "clerk", "workos"].includes(provider);
}

export function generateAuthPackage(
  config: StackConfig,
  builder: ProjectBuilder,
): void {
  const projectName = config.projectName;
  const provider = config.auth.provider;

  if (!isSupportedAuthProvider(provider)) {
    return;
  }

  builder.addFile(
    "packages/auth/package.json",
    JSON.stringify(
      {
        name: `@${projectName}/auth`,
        version: "0.0.0",
        private: true,
        type: "module",
        main: "./src/index.ts",
        types: "./src/index.ts",
        scripts: {
          build: ":",
          lint: `oxlint --config ../../tooling/oxc/oxlint.json src`,
          format: `oxfmt --config ../../tooling/oxc/oxfmt.json src`,
          "check-types": "tsc --noEmit",
        },
        peerDependencies: {
          react: "^19.2.8",
        },
        dependencies: {
          [`@${projectName}/env`]: "workspace:*",
          ...getSdkDependencies(provider),
        },
        devDependencies: {
          [`@${projectName}/tsconfig`]: "workspace:*",
          "@types/react": "^19.2.18",
          typescript: "^5.8.0",
        },
      },
      null,
      2,
    ),
  );

  builder.addFile(
    "packages/auth/tsconfig.json",
    JSON.stringify(
      {
        extends: `@${projectName}/tsconfig/base.json`,
        compilerOptions: {
          outDir: "dist",
          rootDir: "src",
          jsx: "react-jsx",
        },
        include: ["src"],
      },
      null,
      2,
    ),
  );

  builder.addFile("packages/auth/src/index.ts", generateIndex(provider));
  builder.addFile(
    "packages/auth/src/provider.tsx",
    generateProvider(projectName, provider),
  );
  builder.addFile("packages/auth/src/client.ts", generateClient(provider));
  builder.addFile("packages/auth/src/use-auth.ts", generateUseAuth(provider));
  builder.addFile("packages/auth/src/demo.tsx", generateDemo());
  builder.addFile(
    "packages/auth/README.md",
    generateReadme(projectName, provider),
  );
}

function getSdkDependencies(
  provider: "better-auth" | "clerk" | "workos",
): Record<string, string> {
  switch (provider) {
    case "better-auth":
      return { "better-auth": "^1.0.0" };
    case "clerk":
      return { "@clerk/clerk-react": "^5.0.0" };
    case "workos":
      return { "@workos-inc/authkit-react": "^0.8.0" };
  }
}

function generateIndex(provider: "better-auth" | "clerk" | "workos"): string {
  const sdkExports: Record<string, string> = {
    "better-auth":
      'export { authClient, signIn, signUp, signOut, useSession } from "./client";',
    clerk:
      'export { ClerkProvider, SignIn, SignOut, useClerk, useUser, useClerkAuth } from "./client";',
    workos:
      'export { WorkOSAuthProvider, getAccessToken, useWorkOSAuth, withAuth } from "./client";',
  };

  return `export { AuthProvider } from "./provider";
export { useAuth } from "./use-auth";
export { AuthDemo } from "./demo";
${sdkExports[provider]}
`;
}

function generateProvider(
  projectName: string,
  provider: "better-auth" | "clerk" | "workos",
): string {
  const header = 'import type { ReactNode } from "react";\n';

  switch (provider) {
    case "better-auth":
      return `${header}export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
`;
    case "clerk": {
      return `${header}import { ClerkProvider } from "@clerk/clerk-react";
import { getPublicAuthConfig } from "@${projectName}/env/client";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { clerkPublishableKey } = getPublicAuthConfig();
  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>{children}</ClerkProvider>
  );
}
`;
    }
    case "workos": {
      return `${header}import { AuthProvider as WorkOSAuthProvider } from "@workos-inc/authkit-react";
import { getPublicAuthConfig } from "@${projectName}/env/client";

const { workosClientId } = getPublicAuthConfig();

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <WorkOSAuthProvider clientId={workosClientId}>{children}</WorkOSAuthProvider>
  );
}
`;
    }
  }
}

function generateClient(provider: "better-auth" | "clerk" | "workos"): string {
  switch (provider) {
    case "better-auth":
      return `import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient();
export const { signIn, signUp, signOut, useSession } = authClient;
`;
    case "clerk":
      return `export {
  ClerkProvider,
  SignIn,
  SignOut,
  useAuth as useClerkAuth,
  useClerk,
  useUser,
} from "@clerk/clerk-react";
`;
    case "workos":
      return `export {
  AuthProvider as WorkOSAuthProvider,
  getAccessToken,
  useAuth as useWorkOSAuth,
  withAuth,
} from "@workos-inc/authkit-react";
`;
  }
}

function generateUseAuth(provider: "better-auth" | "clerk" | "workos"): string {
  const header = `export interface AuthState {
  user: unknown;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: () => void;
  signOut: () => void;
}
`;

  switch (provider) {
    case "better-auth": {
      return `${header}import { signOut, useSession } from "./client";

export function useAuth(): AuthState {
  const { data: session, isPending } = useSession();
  return {
    user: session?.user ?? null,
    isAuthenticated: Boolean(session?.user),
    isLoading: isPending,
    signIn: () => {
      // better-auth requires a server route for sign-in flows.
      // Redirect users to your sign-in page or call authClient.signIn.social().
    },
    signOut,
  };
}
`;
    }
    case "clerk": {
      return `${header}import { useClerk, useUser } from "@clerk/clerk-react";

export function useAuth(): AuthState {
  const { user, isSignedIn, isLoaded } = useUser();
  const clerk = useClerk();
  return {
    user: isLoaded && isSignedIn ? user : null,
    isAuthenticated: isLoaded && isSignedIn,
    isLoading: !isLoaded,
    signIn: () => clerk.openSignIn(),
    signOut: () => clerk.signOut(),
  };
}
`;
    }
    case "workos": {
      return `${header}import { useWorkOSAuth } from "./client";

export function useAuth(): AuthState {
  const { user, isLoading, signIn, signOut } = useWorkOSAuth();
  return {
    user: user ?? null,
    isAuthenticated: Boolean(user),
    isLoading,
    signIn,
    signOut,
  };
}
`;
    }
  }
}

function generateDemo(): string {
  return `import { useAuth } from "./use-auth";

export function AuthDemo() {
  const { isAuthenticated, isLoading, signIn, signOut } = useAuth();

  if (isLoading) {
    return <p>Loading auth state...</p>;
  }

  return (
    <div>
      {isAuthenticated ? (
        <button type="button" onClick={signOut}>
          Sign out
        </button>
      ) : (
        <button type="button" onClick={signIn}>
          Sign in
        </button>
      )}
    </div>
  );
}
`;
}

function generateReadme(
  projectName: string,
  provider: "better-auth" | "clerk" | "workos",
): string {
  const sections: Record<string, string> = {
    "better-auth": `## Better Auth

This package wraps \`better-auth\` with a unified client-only API.

### Setup

1. Add a server route to your Next.js app (e.g. \`app/api/auth/[...all]/route.ts\`).
2. Copy the repo-root \`.env.example\` to \`.env\` and fill in the Better Auth values.
3. Import \`AuthProvider\` from \`@${projectName}/auth\` and wrap your app root.
4. Use \`useAuth()\` in components to access session state.

### Env vars

- \`BETTER_AUTH_SECRET\`
- \`BETTER_AUTH_URL\`
- Provider-specific secrets (e.g. \`GITHUB_CLIENT_ID\`)`,
    clerk: `## Clerk

This package wraps \`@clerk/clerk-react\` with a unified API.

### Setup

1. Copy the repo-root \`.env.example\` to \`.env\` and set \`CLERK_SECRET_KEY\` plus the publishable key for your app (\`NEXT_PUBLIC_\`, \`VITE_\`, or \`EXPO_PUBLIC_\`).
2. Import \`AuthProvider\` from \`@${projectName}/auth\` and wrap your app root.
3. Use \`useAuth()\` in components to access session state.

### Env vars

- \`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY\` / \`VITE_CLERK_PUBLISHABLE_KEY\`
- \`CLERK_SECRET_KEY\` (server-only)`,
    workos: `## WorkOS AuthKit

This package wraps \`@workos-inc/authkit-react\` with a unified API.

### Setup

1. Copy the repo-root \`.env.example\` to \`.env\` and set the WorkOS server and client vars.
2. Import \`AuthProvider\` from \`@${projectName}/auth\` and wrap your app root.
3. Use \`useAuth()\` in components to access session state.

### Env vars

- \`NEXT_PUBLIC_WORKOS_CLIENT_ID\`
- \`WORKOS_API_KEY\` (server-only)
- \`WORKOS_COOKIE_PASSWORD\` (server-only)`,
  };

  return `# @${projectName}/auth

Shared authentication package for the monorepo.

## Usage

\`\`\`tsx
import { AuthProvider, AuthDemo, useAuth } from "@${projectName}/auth";

export default function App() {
  return (
    <AuthProvider>
      <AuthDemo />
    </AuthProvider>
  );
}
\`\`\`

${sections[provider]}

## Note

This package exposes a small unified API (\`AuthProvider\`, \`useAuth\`, \`AuthDemo\`) plus the underlying SDK exports for advanced use cases.
`;
}
