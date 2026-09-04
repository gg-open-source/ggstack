import type {
  EmailProvider,
  ProjectBuilder,
  StackConfig,
} from "../../types.js";

type SupportedEmailProvider = Exclude<EmailProvider, "none">;

function isSupportedEmailProvider(
  provider: string,
): provider is SupportedEmailProvider {
  return provider === "resend";
}

export function generateEmailPackage(
  config: StackConfig,
  builder: ProjectBuilder,
): void {
  const projectName = config.projectName;
  const provider = config.email.provider;

  if (!isSupportedEmailProvider(provider)) {
    return;
  }

  builder.addFile(
    "packages/email/package.json",
    JSON.stringify(getPackageJson(projectName), null, 2),
  );

  builder.addFile(
    "packages/email/tsconfig.json",
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

  builder.addFile("packages/email/src/client.ts", generateClient(projectName));
  builder.addFile("packages/email/src/send.ts", generateSend(projectName));
  builder.addFile(
    "packages/email/src/emails/welcome.tsx",
    generateWelcomeEmail(),
  );
  builder.addFile("packages/email/src/index.ts", generateIndex());
  builder.addFile("packages/email/README.md", generateReadme(projectName));
}

function getPackageJson(projectName: string): Record<string, unknown> {
  return {
    name: `@${projectName}/email`,
    version: "0.0.0",
    private: true,
    type: "module",
    main: "./src/index.ts",
    types: "./src/index.ts",
    exports: {
      ".": "./src/index.ts",
    },
    scripts: {
      build: ":",
      "email:dev": "email dev --dir src/emails --port 3001",
      lint: `oxlint --config ../../tooling/oxc/oxlint.json src`,
      format: `oxfmt --config ../../tooling/oxc/oxfmt.json src`,
      "check-types": "tsc --noEmit",
    },
    dependencies: {
      [`@${projectName}/env`]: "workspace:*",
      react: "^19.2.8",
      "react-dom": "^19.2.8",
      "react-email": "^6.9.3",
      resend: "^6.26.0",
    },
    devDependencies: {
      [`@${projectName}/tsconfig`]: "workspace:*",
      "@react-email/ui": "^6.9.3",
      "@types/react": "^19.2.18",
      "@types/react-dom": "^19.2.18",
      typescript: "^5.8.0",
    },
  };
}

function generateClient(projectName: string): string {
  return `import { Resend } from "resend";
import { serverEnv } from "@${projectName}/env/server";

export const resend = new Resend(serverEnv.RESEND_API_KEY);
`;
}

function generateSend(projectName: string): string {
  return `import type { ReactNode } from "react";
import { serverEnv } from "@${projectName}/env/server";
import { resend } from "./client";
import { WelcomeEmail } from "./emails/welcome";

export async function sendEmail(input: {
  to: string | string[];
  subject: string;
  react: ReactNode;
  from?: string;
  replyTo?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
}): Promise<{ id: string }> {
  const { data, error } = await resend.emails.send({
    from: input.from ?? serverEnv.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    react: input.react,
    replyTo: input.replyTo,
    cc: input.cc,
    bcc: input.bcc,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Resend did not return an email id");
  }

  return data;
}

export async function sendWelcomeEmail(input: {
  to: string;
  name: string;
  url?: string;
}): Promise<{ id: string }> {
  return sendEmail({
    to: input.to,
    subject: \`Welcome, \${input.name}\`,
    react: WelcomeEmail({ name: input.name, url: input.url }),
  });
}
`;
}

function generateWelcomeEmail(): string {
  return `import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "react-email";

export interface WelcomeEmailProps {
  name: string;
  url?: string;
}

export function WelcomeEmail({
  name,
  url = "https://example.com",
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome aboard, {name}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Welcome, {name}</Heading>
          <Text style={paragraph}>
            Thanks for signing up. You can get started right away.
          </Text>
          <Section style={buttonSection}>
            <Button href={url} style={button}>
              Get started
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            If you did not create this account, you can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default WelcomeEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 24px",
  maxWidth: "560px",
};

const heading = {
  fontSize: "24px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#111111",
  margin: "0 0 16px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "1.5",
  color: "#374151",
  margin: "0 0 24px",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "0 0 32px",
};

const button = {
  backgroundColor: "#111111",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 20px",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "0 0 16px",
};

const footer = {
  fontSize: "13px",
  lineHeight: "1.5",
  color: "#6b7280",
  margin: "0",
};
`;
}

function generateIndex(): string {
  return `export { resend } from "./client";
export { sendEmail, sendWelcomeEmail } from "./send";
export { WelcomeEmail } from "./emails/welcome";
export type { WelcomeEmailProps } from "./emails/welcome";
`;
}

function generateReadme(projectName: string): string {
  return `# @${projectName}/email

Shared email package using [React Email](https://react.email) templates and [Resend](https://resend.com) to send them. **Not auto-wired** — call the helpers from a server route or job after scaffold.

## Setup

1. Copy the repo-root \`.env.example\` to \`.env\` and fill in the Resend values.
2. Create an API key in the [Resend Dashboard](https://resend.com/api-keys).
3. Verify a domain at [resend.com/domains](https://resend.com/domains) and use it in \`EMAIL_FROM\`. \`onboarding@resend.dev\` is for testing only.

### Env vars

- \`RESEND_API_KEY\`
- \`EMAIL_FROM\` — \`Name <address@yourdomain.com>\`

## Preview templates

\`\`\`bash
pnpm --filter @${projectName}/email email:dev
\`\`\`

Opens the React Email preview server at http://localhost:3001. Templates live in \`src/emails\`. Add a new \`.tsx\` file with a default export to see it in the sidebar.

## Usage

\`\`\`ts
import { sendEmail, sendWelcomeEmail, WelcomeEmail } from "@${projectName}/email";

await sendWelcomeEmail({
  to: user.email,
  name: user.name,
  url: "https://example.com/start",
});

await sendEmail({
  to: user.email,
  subject: "Welcome",
  react: WelcomeEmail({ name: user.name }),
});
\`\`\`

Pass the template as a function call (\`WelcomeEmail({ name })\`), not as JSX. \`sendEmail\` / \`sendWelcomeEmail\` throw if Resend returns an error.

App templates do not mount this package. Import \`@${projectName}/email\` from a server route, tRPC procedure, or background job.

### Next.js App Router

\`\`\`ts
// app/api/email/welcome/route.ts
import { sendWelcomeEmail } from "@${projectName}/email";

export async function POST(req: Request) {
  const user = await auth(req); // your auth
  await sendWelcomeEmail({
    to: user.email,
    name: user.name,
  });
  return Response.json({ ok: true });
}
\`\`\`
`;
}
