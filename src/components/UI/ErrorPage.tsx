import newGithubIssueUrl from "@core/utils/github.ts";
import { ExternalLink } from "lucide-react";
import { Heading } from "@components/UI/Typography/Heading.tsx";
import { Link } from "@components/UI/Typography/Link.tsx";
import { P } from "@components/UI/Typography/P.tsx";

export function ErrorPage({ error }: { error: Error }) {
  if (!error) {
    return null;
  }

  return (
    <article className="w-full h-screen overflow-y-auto dark:bg-background-primary dark:text-text-primary">
      <section className="flex shrink md:flex-row gap-16 mt-20 px-4 md:px-8 text-lg md:text-xl space-y-2 place-items-center dark:bg-background-primary text-slate-900 dark:text-text-primary">
        <div>
          <Heading as="h2" className="text-text-primary">
            This is a little embarrassing...
          </Heading>
          <P>
            We are really sorry but an error occurred in the web client that
            caused it to crash. <br />
            This is not supposed to happen, and we are working hard to fix it.
          </P>
          <P>
            The best way to prevent this from happening again to you or anyone
            else is to report the issue to us.
          </P>
          <P>Please include the following information in your report:</P>
          <ul className="list-disc list-inside text-sm">
            <li>What you were doing when the error occurred</li>
            <li>What you expected to happen</li>
            <li>What actually happened</li>
            <li>Any other relevant information</li>
          </ul>
          <P>
            You can report the issue to our{" "}
            <Link
              href={newGithubIssueUrl({
                repoUrl: "https://github.com/meshtastic/web",
                template: "bug.yml",
                title: "[Bug]: An unhandled error occurred. <Add details here>",
                logs: error?.stack,
              })}
            >
              Github
            </Link>
            <ExternalLink size={24} className="inline-block ml-2" />
          </P>
          <P>
            Return to the <Link href="/">dashboard</Link>
          </P>
        </div>

        <div className="hidden md:block md:max-w-64 lg:max-w-80 w-full aspect-suqare">
          <img
            src="chirpy.svg"
            alt="Chirpy the Meshtastic error"
            className="max-w-full h-auto"
          />
        </div>
      </section>
      <details className="mt-8 px-4 md:px-8 text-lg md:text-xl space-y-2 text-md whitespace-pre-wrap break-all">
        <summary className="cursor-pointer">Error Details</summary>
        <span className="text-sm mt-4">
          {error?.message && (
            <>
              <label htmlFor="message">Error message:</label>
              <p
                id="message"
                className="text-slate-400 break-words overflow-wrap"
              >
                {error.message}
              </p>
            </>
          )}
          {error?.stack && (
            <>
              <label htmlFor="stack">Stack trace:</label>
              <p
                id="stack"
                className="text-slate-400 break-words overflow-wrap"
              >
                {error.stack}
              </p>
            </>
          )}
          {!error?.message && !error?.stack && (
            <p className="text-slate-400">{error.toString()}</p>
          )}
        </span>
      </details>
    </article>
  );
}
