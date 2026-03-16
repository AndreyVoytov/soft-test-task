import { Images } from "../../assets";
import { Utils } from "../../utils/Utils";
import { DialogueMessage, ImageSegment, TextSegment } from "./Types";

export class Config {
  static readonly endpoint = "https://private-624120-softgamesassignment.apiary-mock.com/v2/magicwords";

  static readonly bubbleWidthRatio = 0.82;
  static readonly sidePaddingRatio = 0.04;
  static readonly topPaddingRatio = 0.06;
  static readonly bubbleGapRatio = 0.03;
  static readonly bubblePaddingRatio = 0.025;
  static readonly bubbleRadiusRatio = 0.02;
  static readonly textSizeRatio = 0.03;
  static readonly speakerSizeRatio = 0.025;
  static readonly emojiSizeRatio = 0.038;
  static readonly lineHeightRatio = 1.35;
  static readonly minTextSize = 14;
  static readonly minSpeakerSize = 12;
  static readonly minEmojiSize = 18;
  static readonly minPadding = 10;
  static readonly minGap = 8;

  static readonly fallbackMessages: DialogueMessage[] = [
    new DialogueMessage("Ava", [
      new TextSegment("Hey! Try our magic words "),
      new ImageSegment(Utils.assetPathToUrl(Images["minigame1-icon"]), "icon"),
      new TextSegment(" and "),
      new ImageSegment(Utils.assetPathToUrl(Images["minigame2-icon"]), "icon"),
      new TextSegment("."),
    ]),
    new DialogueMessage("Noah", [new TextSegment("Nice! Text and images now live in one message.")]),
  ];
}

