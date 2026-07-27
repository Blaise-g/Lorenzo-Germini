import { BackToTop } from "@/components/back-to-top";
import { CommandMenu, CommandMenuHint } from "@/components/command-menu";

export function FloatingActionCluster({
  commandLinks,
}: {
  commandLinks?: { title: string; url: string }[];
}) {
  return (
    <>
      {commandLinks ? <CommandMenuHint /> : null}
      <div className="fixed right-4 bottom-4 z-50 flex w-14 flex-col items-center gap-4 print:hidden">
        <BackToTop />
        {commandLinks ? (
          <div className="xl:hidden">
            <CommandMenu links={commandLinks} />
          </div>
        ) : null}
      </div>
    </>
  );
}
