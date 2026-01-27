import { readFileSync } from "fs";
import { Metadata } from "next";
import { compileMDX } from "next-mdx-remote/rsc";
import { join } from "path";
import { APP_NAME, APP_URL } from "@/lib/constants";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `Terms of Service - ${APP_NAME}`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "Review the terms and conditions for using addcn. Learn about your rights, responsibilities, and our service policies.",
  keywords: [
    "terms of service",
    "terms and conditions",
    "addcn",
    "shadcn registry",
    "component registry",
  ],
  authors: [{ name: APP_NAME }],
  creator: APP_NAME,
  publisher: APP_NAME,
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon/favicon.ico", sizes: "48x48" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: [{ url: "/favicon/favicon.ico" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: `${APP_URL}/terms`,
    siteName: APP_NAME,
    title: `Terms of Service - ${APP_NAME}`,
    description:
      "Review the terms and conditions for using addcn. Learn about your rights, responsibilities, and our service policies.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `Terms of Service - ${APP_NAME}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Terms of Service - ${APP_NAME}`,
    description:
      "Review the terms and conditions for using addcn. Learn about your rights, responsibilities, and our service policies.",
    images: ["/og-image.png"],
    creator: "@YassineZaanouni",
  },
};

const components = {
  h1: ({ children }: { children: React.ReactNode }) => (
    <h1 className="mb-8 font-mono text-3xl font-bold tracking-tight sm:text-4xl">
      {children}
    </h1>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <h2 className="mb-4 mt-10 font-mono text-xl font-semibold tracking-tight sm:text-2xl">
      {children}
    </h2>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <h3 className="mb-3 mt-6 font-mono text-lg font-semibold">{children}</h3>
  ),
  p: ({ children }: { children: React.ReactNode }) => (
    <p className="mb-4 leading-relaxed text-muted-foreground">{children}</p>
  ),
  a: ({ children, href }: { children: React.ReactNode; href?: string }) => (
    <a href={href} className="text-primary underline-offset-2 hover:underline">
      {children}
    </a>
  ),
  ul: ({ children }: { children: React.ReactNode }) => (
    <ul className="mb-4 ml-6 list-disc space-y-1">{children}</ul>
  ),
  li: ({ children }: { children: React.ReactNode }) => (
    <li className="leading-relaxed text-muted-foreground">{children}</li>
  ),
  strong: ({ children }: { children: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  hr: () => <hr className="my-8 border-border" />,
};

export default async function TermsPage() {
  const filePath = join(process.cwd(), "content", "terms-of-service.md");
  const source = readFileSync(filePath, "utf8");

  const { content } = await compileMDX({
    source,
    options: {
      parseFrontmatter: false,
      mdxOptions: {
        format: "md",
      },
    },
    components,
  });

  return (
    <article className="container mx-auto max-w-3xl px-4 py-16 md:py-20">
      {content}
    </article>
  );
}
