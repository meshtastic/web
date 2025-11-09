import { Heading } from "@components/UI/Typography/Heading.tsx";
import { Link } from "@components/UI/Typography/Link.tsx";
import { P } from "@components/UI/Typography/P.tsx";
import newGithubIssueUrl from "@core/utils/github.ts";
import { ExternalLink } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

export function ErrorPage({ error }: { error: Error }) {
  const { t } = useTranslation();

  if (!error) {
    return null;
  }

  return (
    <article className="w-full h-screen overflow-y-auto bg-background-primary text-text-primary">
      <section className="flex shrink md:flex-row gap-16 mt-20 px-4 md:px-8 text-lg md:text-xl space-y-2 place-items-center dark:bg-background-primary text-slate-900 dark:text-text-primary">
        <div>
          <Heading as="h2" className="text-text-primary">
            {t("errorPage.title")}
          </Heading>
          <P>{t("errorPage.description1")}</P>
          <P>{t("errorPage.description2")}</P>
          <P>Please include the following information in your report:</P>
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
                    logs: error?.stack,
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
          {error?.message && (
            <>
              <label htmlFor="message">
                {t("errorPage.errorMessageLabel")}
              </label>
              <p className="text-slate-400 break-words overflow-wrap">
                {error.message}
              </p>
            </> // TODO: Use Trans for the label and message together?
          )}
          {error?.stack && (
            <>
              <label htmlFor="stack">{t("errorPage.stackTraceLabel")}</label>
              <p className="text-slate-400 break-words overflow-wrap">
                {error.stack}
              </p>
            </>
          )}
          {!error?.message && !error?.stack && (
            <p className="text-slate-400">
              {t("errorPage.fallbackError", { error: error.toString() })}
            </p>
          )}
        </span>
      </details>
    </article>
  );
}
