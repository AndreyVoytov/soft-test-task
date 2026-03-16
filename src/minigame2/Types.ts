export abstract class SegmentBase {
  abstract readonly type: "text" | "image";
}

export class TextSegment extends SegmentBase {
  readonly type = "text" as const;

  constructor(public readonly text: string) {
    super();
  }
}

export class ImageSegment extends SegmentBase {
  readonly type = "image" as const;

  constructor(
    public readonly url: string,
    public readonly alt: string,
  ) {
    super();
  }
}

export type Segment = TextSegment | ImageSegment;

export class DialogueMessage {
  constructor(
    public readonly speaker: string,
    public readonly segments: Segment[],
  ) {}
}
