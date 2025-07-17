interface RepoIdentifier {
  user: string;
  repo: string;
}

interface GithubIssueUrlOptions extends Partial<RepoIdentifier> {
  repoUrl?: string;
  body?: string;
  title?: string;
  labels?: string[];
  template?: string;
  assignee?: string;
  projects?: string[];
  logs?: string;
  version?: number;
}

type ValidatedOptions = {
  repoUrl: string;
} & Omit<GithubIssueUrlOptions, "repoUrl" | "user" | "repo">;

const VALID_PARAMS = [
  "body",
  "title",
  "labels",
  "template",
  "assignee",
  "projects",
  "version",
  "logs",
] as const;

/**
 * Generates a URL for creating a new GitHub issue
 * @param options Configuration options for the GitHub issue URL
 * @returns A formatted URL string for creating a new GitHub issue
 * @throws {Error} If repository information is missing or invalid
 * @throws {TypeError} If labels or projects are not arrays when provided
 */
export default function newGithubIssueUrl(
  options: GithubIssueUrlOptions = {},
): string {
  const validatedOptions = validateOptions(options);
  const url = new URL(`${validatedOptions.repoUrl}/issues/new`);

  for (const key of VALID_PARAMS) {
    const value = validatedOptions[key];

    if (value === undefined) {
      continue;
    }

    if ((key === "labels" || key === "projects") && Array.isArray(value)) {
      url.searchParams.set(key, value.join(","));
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

function validateOptions(options: GithubIssueUrlOptions): ValidatedOptions {
  const repoUrl =
    options.repoUrl ??
    (options.user && options.repo
      ? `https://github.com/${options.user}/${options.repo}`
      : undefined);

  if (!repoUrl) {
    throw new Error(
      "You need to specify either the `repoUrl` option or both the `user` and `repo` options",
    );
  }

  for (const key of ["labels", "projects"] as const) {
    const value = options[key];
    if (value !== undefined && !Array.isArray(value)) {
      throw new TypeError(`The \`${key}\` option should be an array`);
    }
  }

  return {
    ...options,
    repoUrl,
  };
}
