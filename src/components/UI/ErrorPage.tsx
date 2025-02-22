import newGithubIssueUrl from "@app/core/utils/github";
import { ExternalLink } from "lucide-react";
import { Heading } from "./Typography/Heading";
import { Link } from "./Typography/Link";
import { P } from "./Typography/P";

export function ErrorPage({ error }: { error: Error }) {
  if (!error) {
    return null;
  }

  return (
    <article className="w-full">
      <section className="mx-auto mt-20 p-6 md:p-10 text-xl transition-all duration-150 ease-linear space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <Heading as="h2" className="text-text-primary">
              This is a little embarrassing...
            </Heading>
            <P>
              We are really sorry but an error occured in the web client that
              caused it to crash. This is not supposed to happen and we are
              working hard to fix it.
            </P>
            <P>
              The best way to prevent this from happening again to you or anyone
              else is to report the issue to us.
            </P>
            <P>Please include the following information in your report:</P>
            <ul className="list-disc list-inside text-sm">
              <li>What you were doing when the error occured</li>
              <li>What you expected to happen</li>
              <li>What actually happened</li>
              <li>Any other information you think might be relevant</li>
            </ul>
            <P>
              You can report the issue to our{" "}
              <Link
                href={newGithubIssueUrl({
                  repoUrl: "https://github.com/meshtastic/web",
                  template: "bug.yml",
                  title:
                    "[Bug]: An unhandled error occurred. <Add details here>",
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

            <details className="mt-6 text-md">
              <summary className="cursor-pointer">Error Details</summary>
              <span className="block text-sm mt-4 overflow-auto">
                {error?.message ? (
                  <>
                    <label htmlFor="message">Error message:</label>
                    <pre
                      id="message"
                      className="w-full text-slate-400"
                    >{`${error.message}`}</pre>
                  </>
                ) : null}
                {error?.stack ? (
                  <>
                    <label htmlFor="stack">Stack trace:</label>
                    <pre
                      id="stack"
                      className="w-full text-slate-400"
                    >{`${error.stack}`}</pre>
                  </>
                ) : null}
                {!error?.message && !error?.stack ? (
                  <pre className=" w-full text-slate-400">
                    {error.toString()}
                  </pre>
                ) : null}
              </span>
            </details>
          </div>
          <img
            src="/images/chirpy.svg"
            alt="Chripy the Meshtastic error"
            className="max-w-2/5 aspect-auto place-self-center md:justify-self-start"
          />
        </div>
      </section>
    </article>
  );
}
