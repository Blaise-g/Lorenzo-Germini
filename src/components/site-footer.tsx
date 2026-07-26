import { RESUME_DATA } from "@/data/resume-data";

const footerLinkClass =
  "touch-target underline decoration-border underline-offset-4 hover:decoration-primary";

export function SiteFooter() {
  return (
    <footer className="container mx-auto px-4 pr-16 pb-20 md:px-16 print:px-12 print:pb-4">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 border-t pt-6 text-sm sm:flex-row sm:items-end sm:justify-between print:pt-4">
        <div className="space-y-1">
          <p className="font-semibold">{RESUME_DATA.name}</p>
          <p className="text-muted-foreground">{RESUME_DATA.location}</p>
        </div>

        <div className="space-y-3 sm:text-right">
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-4 gap-y-1 sm:justify-end">
              {RESUME_DATA.contact.email ? (
                <li>
                  <a
                    className={footerLinkClass}
                    href={`mailto:${RESUME_DATA.contact.email}`}
                  >
                    Email
                  </a>
                </li>
              ) : null}
              {RESUME_DATA.contact.tel ? (
                <li>
                  <a
                    className={footerLinkClass}
                    href={`tel:${RESUME_DATA.contact.tel}`}
                  >
                    Phone
                  </a>
                </li>
              ) : null}
              {RESUME_DATA.contact.social.map((social) => (
                <li key={social.name}>
                  <a
                    className={footerLinkClass}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {social.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <p className="text-muted-foreground">
            agents welcome →{" "}
            <a className={footerLinkClass} href="/llms.txt">
              /llms.txt
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
