export type FormatDetectorInput = {
  aboutTheAdFormat: string;
  hasPromotedBy: boolean;
  hasImageFile?: boolean;
};

export type AdFormat =
  | "single_image"
  | "video"
  | "carousel"
  | "thought_leader_text"
  | "thought_leader_image"
  | "thought_leader_video"
  | "document"
  | "event"
  | "conversation"
  | "text"
  | "spotlight"
  | "other";

export function detectAdFormat(input: FormatDetectorInput): AdFormat {
  const { aboutTheAdFormat, hasPromotedBy, hasImageFile = true } = input;
  const format = aboutTheAdFormat.trim();

  if (hasPromotedBy) {
    if (/video\s*ad/i.test(format)) return "thought_leader_video";
    if (/single\s*image\s*ad/i.test(format)) {
      return hasImageFile ? "thought_leader_image" : "thought_leader_text";
    }
    if (/carousel/i.test(format)) return "carousel";
    if (/document/i.test(format)) return "document";
    if (/event/i.test(format)) return "event";
    if (/message/i.test(format) || /conversation/i.test(format))
      return "conversation";
    if (/text\s*ad/i.test(format)) return "thought_leader_text";
    if (/spotlight/i.test(format)) return "spotlight";
    return "other";
  }

  if (/single\s*image\s*ad/i.test(format)) return "single_image";
  if (/video\s*ad/i.test(format)) return "video";
  if (/carousel\s*ad/i.test(format)) return "carousel";
  if (/document\s*ad/i.test(format)) return "document";
  if (/event\s*ad/i.test(format)) return "event";
  if (/message\s*ad/i.test(format) || /conversation\s*ad/i.test(format))
    return "conversation";
  if (/text\s*ad/i.test(format)) return "text";
  if (/spotlight\s*ad/i.test(format)) return "spotlight";

  return "other";
}
