import type {
  CompoundCompletionCommand,
  CompoundCompletionReceipt,
  CompoundGuideSnapshot,
} from '@/types';
import { parseCompoundGuideSnapshot } from '@/utils/compoundGuide';
import {
  authenticatedFetch,
  RequestTimeoutError,
} from './authenticatedFetch.service';
import {
  getAuthToken,
  isAuthTokenExpiredError,
  refreshAuthTokens,
} from './auth.service';
import {
  ApiRequestError,
  createApiRequestError,
  getApiErrorUserMessage,
} from './apiError.service';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const logCompoundGuideDiagnostics = (
  value: unknown,
  context: { operation: 'CREATE' | 'READ' | 'COMPLETE'; httpStatus: number },
): void => {
  const receipt = isRecord(value) ? value : null;
  const data = isRecord(receipt?.snapshot) ? receipt.snapshot : receipt;
  const plan = isRecord(data?.compound) ? data.compound : null;
  const progress = isRecord(data?.progress) ? data.progress : null;
  // Android의 한 줄 길이 제한으로 전체 응답 뒤쪽의 보류 사유가 잘리므로 원인 필드를 따로 출력합니다.
  console.warn(
    '[CompoundGuide API][Diagnostics]',
    JSON.stringify({
      ...context,
      sessionId: data?.sessionId ?? null,
      schemaVersion: data?.schemaVersion ?? null,
      guideStatus: data?.status ?? null,
      compoundStatus: plan?.status ?? null,
      planId: plan?.planId ?? null,
      blockedReasons: plan?.blockedReasons ?? null,
      call119Required: plan?.call119Required ?? null,
      consciousness: isRecord(plan?.patientContext)
        ? plan.patientContext.consciousness
        : null,
      relations: plan?.relations ?? null,
      executionStepCount: Array.isArray(plan?.execution)
        ? plan.execution.length
        : null,
      progressStatus: progress?.status ?? null,
      revision: progress?.revision ?? null,
      currentStepId: progress?.currentStepId ?? null,
      blockedReason: progress?.blockedReason ?? null,
      usedSupplyCount: Array.isArray(data?.usedSupplies)
        ? data.usedSupplies.length
        : null,
      outcome: receipt?.outcome ?? null,
    }),
  );
  if (!Array.isArray(plan?.injuries)) {
    return;
  }
  plan.injuries.forEach(injury => {
    if (!isRecord(injury)) {
      return;
    }
    const assessment = isRecord(injury.assessment) ? injury.assessment : null;
    console.warn(
      '[CompoundGuide API][Injury]',
      JSON.stringify({
        operation: context.operation,
        injuryId: injury.injuryId,
        categoryCode: injury.categoryCode,
        locationScope: isRecord(injury.location) ? injury.location.scope : null,
        disposition: injury.disposition ?? null,
        subtypeCode: assessment?.subtypeCode ?? null,
        severityCode: assessment?.severityCode ?? null,
        missingInputs: assessment?.missingInputs ?? null,
        call119Required: assessment?.call119Required ?? null,
        deferredReason: injury.deferredReason ?? null,
        questionnaireIds: Array.isArray(injury.questionnaire)
          ? injury.questionnaire
              .filter(isRecord)
              .map(answer => answer.questionId)
          : null,
      }),
    );
  });
};
const invalidResponse = (status = 200): ApiRequestError =>
  new ApiRequestError(
    {
      code: 'INVALID_RESPONSE',
      message: '복합 가이드 서버 응답을 확인하지 못했습니다.',
      details: [],
    },
    status,
  );

const requestCompoundSession = async (
  sessionId: string,
  init: RequestInit,
  isCompletion = false,
): Promise<unknown> => {
  const path = `/api/v1/sessions/${encodeURIComponent(sessionId)}${
    isCompletion ? '/steps' : ''
  }`;
  console.warn('[CompoundGuide API][Request]', { path, method: init.method });
  let response: Response;
  try {
    response = await authenticatedFetch({
      path,
      getAccessToken: getAuthToken,
      isAccessTokenExpiredError: isAuthTokenExpiredError,
      refreshAccessToken: async () => (await refreshAuthTokens()).accessToken,
      init,
    });
  } catch (error) {
    console.error('[CompoundGuide API][Transport Error]', {
      path,
      method: init.method,
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : null,
      code: error instanceof ApiRequestError ? error.code : null,
      status: error instanceof ApiRequestError ? error.status : null,
    });
    throw error;
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    console.error('[CompoundGuide API][Invalid JSON]', {
      path,
      status: response.status,
    });
    throw invalidResponse(response.status);
  }
  const failure =
    isRecord(payload) && isRecord(payload.error) ? payload.error : null;
  console.warn('[CompoundGuide API][Response]', {
    path,
    status: response.status,
    ok: response.ok,
    errorCode: failure?.code ?? null,
    errorMessage: failure?.message ?? null,
  });
  if (isRecord(payload) && payload.success === true) {
    logCompoundGuideDiagnostics(payload.data, {
      operation: isCompletion ? 'COMPLETE' : 'READ',
      httpStatus: response.status,
    });
  }
  if (!response.ok || (isRecord(payload) && payload.success === false)) {
    throw createApiRequestError(
      payload,
      response.status,
      '복합 가이드 요청에 실패했습니다.',
    );
  }
  if (
    !isRecord(payload) ||
    payload.success !== true ||
    !isRecord(payload.data)
  ) {
    console.error('[CompoundGuide API][Invalid Envelope]', {
      path,
      status: response.status,
      keys: isRecord(payload) ? Object.keys(payload) : null,
    });
    throw invalidResponse(response.status);
  }
  return payload.data;
};

export const readCompoundGuideSession = async (
  sessionId: string,
  signal?: AbortSignal,
): Promise<CompoundGuideSnapshot> => {
  const snapshot = parseCompoundGuideSnapshot(
    await requestCompoundSession(sessionId, { method: 'GET', signal }),
  );
  if (snapshot.sessionId !== sessionId) {
    throw invalidResponse();
  }
  return snapshot;
};

export const completeCompoundGuideStep = async (
  sessionId: string,
  command: CompoundCompletionCommand,
  signal?: AbortSignal,
): Promise<CompoundCompletionReceipt> => {
  const value = await requestCompoundSession(
    sessionId,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
      signal,
    },
    true,
  );
  if (
    !isRecord(value) ||
    !['COMPLETED', 'DUPLICATE', 'BLOCKED'].includes(String(value.outcome))
  ) {
    throw invalidResponse();
  }
  const snapshot = parseCompoundGuideSnapshot(value.snapshot);
  const isDone = snapshot.progress?.completedStepIds.includes(
    command.executionStepId,
  );
  if (
    snapshot.sessionId !== sessionId ||
    snapshot.planId !== command.planId ||
    (value.outcome === 'BLOCKED'
      ? isDone ||
        snapshot.progress?.currentStepId !== command.executionStepId ||
        snapshot.progress?.status !== 'BLOCKED'
      : !isDone)
  ) {
    throw invalidResponse();
  }
  return {
    outcome: value.outcome as CompoundCompletionReceipt['outcome'],
    snapshot,
  };
};

export const getCompoundGuideErrorMessage = (error: unknown): string => {
  if (error instanceof RequestTimeoutError) {
    return error.message;
  }
  if (error instanceof TypeError) {
    return '네트워크 연결을 확인한 후 다시 시도해 주세요.';
  }
  return getApiErrorUserMessage(error, {
    fallbackMessage:
      '복합 가이드 요청을 확인하지 못했습니다. 다시 시도해 주세요.',
    codeMessages: {
      INVALID_RESPONSE:
        '복합 가이드 서버 응답을 확인하지 못했습니다. 저장된 상태를 다시 조회해 주세요.',
      SESSION_NOT_FOUND: '저장된 복합 가이드를 찾을 수 없습니다.',
    },
  });
};
