import type {
  CompoundQuestionnaireDraft,
  EmergencyGuideMediaFile,
  EmergencyGuidePhotoRequest,
} from '@/types';

export type PreviousEmergencyEvidence =
  | { id: string; kind: 'image' | 'audio'; file: EmergencyGuideMediaFile }
  | { id: string; kind: 'text'; text: string };

export const getPreviousEmergencyEvidence = (
  media?: EmergencyGuidePhotoRequest,
): PreviousEmergencyEvidence[] => [
  ...(media?.images.map((file, index) => ({
    id: `image-${index}`,
    kind: 'image' as const,
    file,
  })) ?? []),
  ...(media?.audio
    ? [{ id: 'audio', kind: 'audio' as const, file: media.audio }]
    : []),
  ...(media?.text?.trim()
    ? [{ id: 'text', kind: 'text' as const, text: media.text.trim() }]
    : []),
];

export const getPreviousEvidenceInjuryId = (
  draft: CompoundQuestionnaireDraft,
  evidence: PreviousEmergencyEvidence,
): string | undefined =>
  draft.injuries.find(injury =>
    evidence.kind === 'text'
      ? injury.observationText?.includes(evidence.text)
      : evidence.kind === 'image'
      ? injury.images?.some(image => image.uri === evidence.file.uri)
      : injury.audio?.uri === evidence.file.uri,
  )?.injuryId;

export const assignPreviousEvidence = (
  draft: CompoundQuestionnaireDraft,
  evidence: PreviousEmergencyEvidence,
  injuryId: string,
): CompoundQuestionnaireDraft => {
  if (!draft.injuries.some(injury => injury.injuryId === injuryId))
    return draft;
  return {
    ...draft,
    injuries: draft.injuries.map(injury => {
      const isTarget = injury.injuryId === injuryId;
      if (evidence.kind === 'text') {
        const remaining = (injury.observationText ?? '')
          .split(evidence.text)
          .join('')
          .trim();
        return {
          ...injury,
          observationText: [remaining, ...(isTarget ? [evidence.text] : [])]
            .filter(Boolean)
            .join('\n'),
        };
      }
      if (evidence.kind === 'audio') {
        // 기존 계약은 음성 한 개만 허용하므로 대상 손상을 바꿀 때도 복제하지 않습니다.
        return { ...injury, audio: isTarget ? evidence.file : null };
      }
      const images = (injury.images ?? []).filter(
        image => image.uri !== evidence.file.uri,
      );
      return {
        ...injury,
        images: isTarget ? [...images, evidence.file] : images,
      };
    }),
  };
};
