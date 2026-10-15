import { Heading } from "@components/UI/Typography/Heading.tsx";
import { Link } from "@components/UI/Typography/Link.tsx";
import { P } from "@components/UI/Typography/P.tsx";
import newGithubIssueUrl from "@core/utils/github.ts";
import { ExternalLink } from "lucide-react";
import type { FallbackProps } from "react-error-boundary";
import { Trans, useTranslation } from "react-i18next";

/** Reads a string `message` or `stack` off a thrown value, whatever its type. */
function thrownString(
  thrown: unknown,
  key: "message" | "stack",
): string | undefined {
  if (typeof thrown !== "object" || thrown === null) {
    return undefined;
  }
  const value: unknown = Reflect.get(thrown, key);
  return typeof value === "string" ? value : undefined;
}

export function ErrorPage({ error }: Pick<FallbackProps, "error">) {
  const { t } = useTranslation();

  if (!error) {
    return null;
  }

  const message = thrownString(error, "message");
  const stack = thrownString(error, "stack");

  return (
    <article className="w-full h-screen overflow-y-auto bg-background-primary text-text-primary">
      <section className="flex shrink md:flex-row gap-16 mt-20 px-4 md:px-8 text-lg md:text-xl space-y-2 place-items-center dark:bg-background-primary text-slate-900 dark:text-text-primary">
        <div>
          <Heading as="h2" className="text-text-primary">
            {t("errorPage.title")}
          </Heading>
          <P>{t("errorPage.description1")}</P>
          <P>{t("errorPage.description2")}</P>
          <P>{t("errorPage.reportInstructions")}</P>
          <ul className="list-disc list-inside text-sm">
            <li>{t("errorPage.reportSteps.step1")}</li>
            <li>{t("errorPage.reportSteps.step2")}</li>
            <li>{t("errorPage.reportSteps.step3")}</li>
            <li>{t("errorPage.reportSteps.step4")}</li>
          </ul>
          <P>
            <Trans
              i18nKey="errorPage.reportLink"
              components={[
                <Link
                  key="github"
                  href={newGithubIssueUrl({
                    repoUrl: "https://github.com/meshtastic/web",
                    template: "bug.yml",
                    title:
                      "[Bug]: An unhandled error occurred. <Add details here>",
                    logs: stack,
                  })}
                />,
              ]}
            />
            <ExternalLink size={24} className="inline-block ml-2" />
          </P>
          <P>
            <Trans
              i18nKey="errorPage.connectionsLink"
              components={[<Link key="connections" href="/" />]}
            />
          </P>
        </div>

        <div className="hidden md:block md:max-w-64 lg:max-w-80 w-full aspect-suqare">
          <img
            src="/chirpy.svg"
            alt="Chirpy the Meshtastic error"
            className="max-w-full h-auto"
          />
        </div>
      </section>
      <details className="mt-8 px-4 md:px-8 text-lg md:text-xl space-y-2 text-md whitespace-pre-wrap break-all">
        <summary className="cursor-pointer">
          {t("errorPage.detailsSummary")}
        </summary>
        <span className="text-sm mt-4">
          {message && (
            <>
              <label htmlFor="message">
                {t("errorPage.errorMessageLabel")}
              </label>
              <p className="text-slate-400 break-words overflow-wrap">
                {message}
              </p>
            </> // TODO: Use Trans for the label and message together?
          )}
          {stack && (
            <>
              <label htmlFor="stack">{t("errorPage.stackTraceLabel")}</label>
              <p className="text-slate-400 break-words overflow-wrap">
                {stack}
              </p>
            </>
          )}
          {!message && !stack && (
            <p className="text-slate-400">
              {t("errorPage.fallbackError", { error: String(error) })}
            </p>
          )}
        </span>
      </details>
    </article>
  );
}
