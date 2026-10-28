/** The scene a step shows on the 3D path. Home's three steps share one. */
export type PathSceneId = "home" | "turin" | "switzerland" | "lille" | "open";

/** Which of home's builds a step is: its first visit, then each return. */
export type HomeStage = 1 | 2 | 3;

export type PathLink = {
  label: string;
  href: string;
};

/** A role, degree or job held during a step, with its dates as the CV gives
 *  them ("May 2025", "Present", "2017"). */
export type PathRole = {
  title: string;
  organisation: string;
  /** Where it was: the CV's badge, or a place the path names more plainly. */
  location: string;
  start: string;
  end: string;
};

/** One object in a scene. Its caption is one of the step's own `lines`, by
 *  index, so the highlight on the text panel and the voice never drift from
 *  the text (GH-141, implementation decision 1). */
export type PathProp = {
  id: string;
  name: string;
  /** Index into the step's `lines`. */
  captionLine: number;
};

/** A scene's landmark blended with the work done there, labelled as an
 *  illustration and naming what it draws on (GH-141, decision 3). */
export type PathIllustration = {
  label: string;
  inspirations: readonly string[];
};

export type PathStep = {
  /** The fragment on both routes, without the `#`: `/#lille`, `/path#lille`. */
  slug: string;
  place: string;
  /** "2017–20", "2024–now"; absent for home, which has no dates, and for "?". */
  period?: string;
  roles: readonly PathRole[];
  /** The step's text, one sentence per line, taken from `RESUME_DATA`. These
   *  are its documented results and the captions its props point at. */
  lines: readonly string[];
  links: readonly PathLink[];
  props: readonly PathProp[];
  illustration: PathIllustration;
  sceneId: PathSceneId;
  /** Set on home's three steps only. */
  homeStage?: HomeStage;
  /** `lines` joined: what the text panel shows. */
  text: string;
  /** Word for word the step's text (GH-141, decision 9). */
  voiceScript: string;
};

/** A side project beside the path. It carries no dates, because the data gives
 *  it none (GH-141, decision 2). */
export type PathSideProp = {
  slug: string;
  title: string;
  lines: readonly string[];
  link: PathLink;
  text: string;
};
