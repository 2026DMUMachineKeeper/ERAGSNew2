import { assign, fromPromise, setup } from 'xstate';
import type { InventoryPort } from '../services/dbService';
import type {
  MlSessionPort,
  RuntimeEventContext,
  StepCompletedPayload,
} from '../services/mlService';
import { currentStepRequiresInventory, hasNextStep, isChecked } from './guards';
import {
  SessionError,
  type AccidentClassification,
  type PatientContext,
  type Plan,
  type SessionErrorCode,
  type TreatmentContext,
  type TreatmentEvent,
  type TreatmentSession,
  type TreatmentStep,
} from './types';

const sessionErrorCodes: SessionErrorCode[] = [
  'SERVER_UNAVAILABLE',
  'INVALID_RESPONSE',
  'INSUFFICIENT_QUANTITY',
  'PLAN_STEPS_UNAVAILABLE',
  'LOG_SAVE_FAILED',
  'MODEL_LOAD_FAILED',
];

export interface TreatmentMachineInput {
  ml: MlSessionPort;
  inventory: InventoryPort;
}

interface MachineContext extends TreatmentContext {
  ports: TreatmentMachineInput;
}

interface CreateSessionInput {
  ml: MlSessionPort;
  accident: AccidentClassification;
  patientContext: PatientContext;
  planType?: Plan;
}

interface SwitchPlanInput {
  ml: MlSessionPort;
  session: TreatmentSession;
  nextPlan: Plan;
  note: string;
}

interface InventoryInput {
  inventory: InventoryPort;
  itemId: number;
  slotId: number | null;
}

interface VerifyPlanInventoryInput {
  inventory: InventoryPort;
  steps: TreatmentStep[];
}

type RequiredInventoryItem = {
  itemId: number;
  slotId: number | null;
  amount: number;
};

interface LogStepInput {
  ml: MlSessionPort;
  payload: StepCompletedPayload;
}

interface RuntimeEventInput {
  ml: MlSessionPort;
  payload: RuntimeEventContext & { note?: string };
}

function normalizeError(error: unknown): SessionError {
  if (error instanceof SessionError) {
    return error;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    sessionErrorCodes.includes(error.code as SessionErrorCode)
  ) {
    return new SessionError(
      error.code as SessionErrorCode,
      'message' in error && typeof error.message === 'string'
        ? error.message
        : 'Treatment service failed',
    );
  }
  return new SessionError(
    'INVALID_RESPONSE',
    'Unexpected treatment service failure',
  );
}

function runtimeEventContext(context: MachineContext): RuntimeEventContext {
  if (!context.session) {
    throw new SessionError('INVALID_RESPONSE', 'Session not initialized');
  }

  return {
    sessionId: context.session.sessionId,

    accidentType: context.session.accidentType,

    planType: context.session.plan,
  };
}

function nextInventoryFallbackPlan(plan: Plan | null): Plan | null {
  if (plan === 'A') {
    return 'B';
  }

  if (plan === 'B') {
    return 'C';
  }

  return null;
}

function requiredInventoryForSteps(
  steps: TreatmentStep[],
): RequiredInventoryItem[] {
  const requiredByKey = new Map<string, RequiredInventoryItem>();

  for (const step of steps) {
    if (typeof step.requiredItemId !== 'number') {
      continue;
    }

    const key =
      typeof step.requiredSlotId === 'number'
        ? `slot:${step.requiredSlotId}`
        : `item:${step.requiredItemId}`;
    const current = requiredByKey.get(key);

    if (current) {
      current.amount += 1;
      continue;
    }

    requiredByKey.set(key, {
      itemId: step.requiredItemId,
      slotId: step.requiredSlotId,
      amount: 1,
    });
  }

  return Array.from(requiredByKey.values());
}

export const treatmentMachine = setup({
  types: {
    context: {} as MachineContext,
    events: {} as TreatmentEvent,
    input: {} as TreatmentMachineInput,
  },
  actors: {
    createTreatmentSession: fromPromise(
      async ({ input }: { input: CreateSessionInput }) =>
        input.ml.createSession(
          input.accident,
          input.patientContext,
          input.planType,
        ),
    ),
    switchTreatmentPlan: fromPromise(
      async ({ input }: { input: SwitchPlanInput }) =>
        input.ml.switchPlan(input.session, input.nextPlan, input.note),
    ),
    decreaseInventory: fromPromise(
      async ({ input }: { input: InventoryInput }) => {
        if (input.inventory.decreaseRequiredItem) {
          return input.inventory.decreaseRequiredItem({
            itemId: input.itemId,
            slotId: input.slotId,
          });
        }

        const useId = input.slotId ?? input.itemId;
        await input.inventory.decreaseQuantity(useId);
        return useId;
      },
    ),
    verifyPlanInventory: fromPromise(
      async ({ input }: { input: VerifyPlanInventoryInput }) => {
        if (!input.inventory.canUseRequiredItem) {
          return;
        }

        const requiredItems = requiredInventoryForSteps(input.steps);

        for (const item of requiredItems) {
          const canUse = await input.inventory.canUseRequiredItem({
            itemId: item.itemId,
            slotId: item.slotId,
            amount: item.amount,
          });

          if (!canUse) {
            throw new SessionError(
              'INSUFFICIENT_QUANTITY',
              'Required medicine quantity is insufficient',
            );
          }
        }
      },
    ),
    saveStepLog: fromPromise(async ({ input }: { input: LogStepInput }) => {
      await input.ml.onStepCompleted(input.payload);
    }),
    finishSession: fromPromise(
      async ({ input }: { input: RuntimeEventInput }) =>
        input.ml.onSessionCompleted(input.payload),
    ),
    generateEmergencyQr: fromPromise(
      async ({ input }: { input: RuntimeEventInput }) =>
        input.ml.onEmergencyOverride(input.payload),
    ),
  },
  guards: {
    checked: ({ context }) => isChecked(context),
    hasNextStep: ({ context }) => hasNextStep(context),
    hasSession: ({ context }) => context.session !== null,
    hasPendingPlan: ({ context }) =>
      context.session !== null && context.pendingPlan !== null,
    // Terminal service calls write the log before generating QR output.
    terminalLogRetrySafe: ({ context }) =>
      context.lastError?.code === 'LOG_SAVE_FAILED',
    validPlanSwitch: ({ context, event }) =>
      event.type === 'MANUAL_OVERRIDE' &&
      context.session !== null &&
      event.nextPlan !== context.plan,
    canFallbackPlanForInsufficientInventory: ({ context }) =>
      context.session !== null &&
      nextInventoryFallbackPlan(context.plan ?? context.session.plan) !== null,
  },
}).createMachine({
  id: 'treatment',
  initial: 'idle',
  context: ({ input }) => ({
    ports: input,
    session: null,
    steps: [],
    currentIndex: 0,
    plan: null,
    isChecked: false,
    pendingAccident: null,
    patientContext: null,
    pendingPlan: null,
    pendingPlanNote: null,
    inventoryConsumedForStep: false,
    inventoryConsumedSlotId: null,
    lastError: null,
    qrPayload: null,
    emergencyNote: null,
  }),
  on: {
    START: {
      target: '.loadingSession',
      actions: assign({
        session: () => null,
        steps: () => [],
        currentIndex: () => 0,
        plan: () => null,
        isChecked: () => false,
        pendingAccident: ({ event }) => event.accident,
        patientContext: ({ event }) => event.patientContext,
        pendingPlan: ({ event }) => event.planType ?? null,
        pendingPlanNote: () => null,
        inventoryConsumedForStep: () => false,
        inventoryConsumedSlotId: () => null,
        lastError: () => null,
        qrPayload: () => null,
        emergencyNote: () => null,
      }),
    },
  },
  states: {
    idle: {
      on: {},
    },
    loadingSession: {
      // loadingSession에서 ml.createSession() 호출
      invoke: {
        src: 'createTreatmentSession',
        input: ({ context }) => ({
          ml: context.ports.ml,
          accident: context.pendingAccident as AccidentClassification,
          patientContext: context.patientContext as PatientContext,
          planType: context.pendingPlan ?? undefined,
        }),
        onDone: {
          target: 'checkingPlanInventory',
          actions: assign({
            session: ({ event }) => event.output,
            steps: ({ event }) => event.output.steps,
            plan: ({ event }) => event.output.plan,
            currentIndex: () => 0,
            isChecked: () => false,
            pendingPlan: () => null,
            pendingPlanNote: () => null,
            inventoryConsumedForStep: () => false,
            inventoryConsumedSlotId: () => null,
            lastError: () => null,
          }),
        },
        onError: {
          target: 'serverUnavailable',
          actions: assign({
            lastError: ({ event }) => normalizeError(event.error),
          }),
        },
      },
    },
    checkingPlanInventory: {
      invoke: {
        src: 'verifyPlanInventory',
        input: ({ context }) => ({
          inventory: context.ports.inventory,
          steps: context.steps,
        }),
        onDone: {
          target: 'showStep',
          actions: assign({
            lastError: () => null,
          }),
        },
        onError: [
          {
            guard: ({ context, event }) =>
              normalizeError(event.error).code === 'INSUFFICIENT_QUANTITY' &&
              nextInventoryFallbackPlan(
                context.plan ?? context.session?.plan ?? null,
              ) !== null,
            target: 'switchingPlan',
            actions: assign({
              pendingPlan: ({ context }) =>
                nextInventoryFallbackPlan(
                  context.plan ?? context.session?.plan ?? null,
                ),
              pendingPlanNote: () => 'Plan inventory unavailable',
              lastError: ({ event }) => normalizeError(event.error),
            }),
          },
          {
            guard: ({ event }) =>
              normalizeError(event.error).code === 'INSUFFICIENT_QUANTITY',
            target: 'inventoryInsufficient',
            actions: assign({
              lastError: ({ event }) => normalizeError(event.error),
            }),
          },
          {
            target: 'serverUnavailable',
            actions: assign({
              lastError: ({ event }) => normalizeError(event.error),
            }),
          },
        ],
      },
    },
    serverUnavailable: {
      on: {
        RETRY: [
          { guard: 'hasPendingPlan', target: 'switchingPlan' },
          { target: 'loadingSession' },
        ],
        EMERGENCY: {
          guard: 'hasSession',
          target: 'generatingEmergencyQr',
          actions: assign({ emergencyNote: ({ event }) => event.note ?? null }),
        },
      },
    },
    showStep: {
      on: {
        NEXT: 'checkPoint',
        MANUAL_OVERRIDE: {
          guard: 'validPlanSwitch',
          target: 'switchingPlan',
          actions: assign({
            pendingPlan: ({ event }) => event.nextPlan,
            pendingPlanNote: ({ event }) => event.note ?? 'Manual Override',
          }),
        },
        EMERGENCY: {
          target: 'generatingEmergencyQr',
          actions: assign({ emergencyNote: ({ event }) => event.note ?? null }),
        },
      },
    },
    checkPoint: {
      on: {
        TOGGLE: {
          actions: assign({ isChecked: ({ event }) => event.checked }),
        },
        CONFIRM: [
          {
            guard: ({ context }) =>
              isChecked(context) && currentStepRequiresInventory(context),
            target: 'savingInventory',
          },
          { guard: 'checked', target: 'savingLog' },
        ],
        MANUAL_OVERRIDE: {
          guard: 'validPlanSwitch',
          target: 'switchingPlan',
          actions: assign({
            pendingPlan: ({ event }) => event.nextPlan,
            pendingPlanNote: ({ event }) => event.note ?? 'Manual Override',
          }),
        },
        EMERGENCY: {
          target: 'generatingEmergencyQr',
          actions: assign({ emergencyNote: ({ event }) => event.note ?? null }),
        },
      },
    },
    savingInventory: {
      invoke: {
        src: 'decreaseInventory',
        input: ({ context }) => ({
          inventory: context.ports.inventory,
          itemId: context.steps[context.currentIndex]?.requiredItemId as number,
          slotId: context.steps[context.currentIndex]?.requiredSlotId ?? null,
        }),
        onDone: {
          target: 'savingLog',
          actions: assign({
            inventoryConsumedForStep: () => true,
            inventoryConsumedSlotId: ({ event }) => event.output,
          }),
        },
        onError: [
          {
            guard: ({ context, event }) =>
              normalizeError(event.error).code === 'INSUFFICIENT_QUANTITY' &&
              nextInventoryFallbackPlan(
                context.plan ?? context.session?.plan ?? null,
              ) !== null,

            target: 'switchingPlan',

            actions: assign({
              pendingPlan: ({ context }) =>
                nextInventoryFallbackPlan(
                  context.plan ?? context.session?.plan ?? null,
                ),
              pendingPlanNote: () => 'Insufficient inventory fallback',
              inventoryConsumedForStep: () => false,
              inventoryConsumedSlotId: () => null,
              lastError: ({ event }) => normalizeError(event.error),
            }),
          },
          {
            guard: ({ event }) =>
              normalizeError(event.error).code === 'INSUFFICIENT_QUANTITY',

            target: 'inventoryInsufficient',

            actions: assign({
              lastError: ({ event }) => normalizeError(event.error),
            }),
          },
          {
            target: 'inventorySaveFailed',

            actions: assign({
              lastError: ({ event }) => normalizeError(event.error),
            }),
          },
        ],
      },
    },
    inventoryInsufficient: {
      on: {
        RETRY_SAVE: 'savingInventory',
        MANUAL_OVERRIDE: {
          guard: 'validPlanSwitch',
          target: 'switchingPlan',
          actions: assign({
            pendingPlan: ({ event }) => event.nextPlan,
            pendingPlanNote: ({ event }) =>
              event.note ?? 'Insufficient quantity',
          }),
        },
        EMERGENCY: {
          target: 'generatingEmergencyQr',
          actions: assign({ emergencyNote: ({ event }) => event.note ?? null }),
        },
      },
    },
    inventorySaveFailed: {
      on: {
        RETRY_SAVE: 'savingInventory',

        MANUAL_OVERRIDE: {
          guard: 'validPlanSwitch',
          target: 'switchingPlan',

          actions: assign({
            pendingPlan: ({ event }) => event.nextPlan,

            pendingPlanNote: ({ event }) =>
              event.note ?? 'Inventory save uncertain',
          }),
        },

        EMERGENCY: {
          target: 'generatingEmergencyQr',

          actions: assign({
            emergencyNote: ({ event }) => event.note ?? null,
          }),
        },
      },
    },
    switchingPlan: {
      invoke: {
        src: 'switchTreatmentPlan',
        input: ({ context }) => ({
          ml: context.ports.ml,
          session: context.session as TreatmentSession,
          nextPlan: context.pendingPlan as Plan,
          note: context.pendingPlanNote as string,
        }),
        onDone: {
          target: 'checkingPlanInventory',
          actions: assign({
            session: ({ event }) => event.output,
            steps: ({ event }) => event.output.steps,
            plan: ({ event }) => event.output.plan,
            currentIndex: () => 0,
            isChecked: () => false,
            pendingPlan: () => null,
            pendingPlanNote: () => null,
            inventoryConsumedForStep: () => false,
            inventoryConsumedSlotId: () => null,
            lastError: () => null,
          }),
        },
        onError: {
          target: 'serverUnavailable',
          actions: assign({
            lastError: ({ event }) => normalizeError(event.error),
          }),
        },
      },
    },
    savingLog: {
      invoke: {
        src: 'saveStepLog',
        input: ({ context }) => ({
          ml: context.ports.ml,
          payload: {
            ...runtimeEventContext(context),
            stepNo: context.steps[context.currentIndex].stepNo,
            itemUsedId: context.steps[context.currentIndex].requiredItemId,
            slotId:
              context.steps[context.currentIndex].requiredSlotId ??
              context.inventoryConsumedSlotId,
          },
        }),
        onDone: [
          {
            guard: 'hasNextStep',
            target: 'showStep',
            actions: assign({
              currentIndex: ({ context }) => context.currentIndex + 1,
              isChecked: () => false,
              inventoryConsumedForStep: () => false,
              inventoryConsumedSlotId: () => null,
              lastError: () => null,
            }),
          },
          { target: 'finalizing' },
        ],
        onError: {
          target: 'logSaveFailed',
          actions: assign({
            lastError: ({ event }) => normalizeError(event.error),
          }),
        },
      },
    },
    logSaveFailed: {
      on: {
        RETRY_SAVE: 'savingLog',
        EMERGENCY: {
          target: 'generatingEmergencyQr',
          actions: assign({ emergencyNote: ({ event }) => event.note ?? null }),
        },
      },
    },
    finalizing: {
      invoke: {
        src: 'finishSession',
        input: ({ context }) => ({
          ml: context.ports.ml,
          payload: {
            ...runtimeEventContext(context),

            stepNo: context.steps[context.currentIndex]?.stepNo ?? 0,

            itemUsedId:
              context.steps[context.currentIndex]?.requiredItemId ?? null,

            slotId:
              context.steps[context.currentIndex]?.requiredSlotId ??
              context.inventoryConsumedSlotId,
          },
        }),
        onDone: {
          target: 'completed',
          actions: assign({
            qrPayload: ({ event }) => event.output,
            lastError: () => null,
          }),
        },
        onError: {
          target: 'completionFailed',
          actions: assign({
            lastError: ({ event }) => normalizeError(event.error),
          }),
        },
      },
    },
    completionFailed: {
      on: {
        RETRY_SAVE: {
          guard: 'terminalLogRetrySafe',
          target: 'finalizing',
        },
        EMERGENCY: {
          target: 'generatingEmergencyQr',
          actions: assign({ emergencyNote: ({ event }) => event.note ?? null }),
        },
      },
    },
    generatingEmergencyQr: {
      invoke: {
        src: 'generateEmergencyQr',
        input: ({ context }) => ({
          ml: context.ports.ml,
          payload: {
            ...runtimeEventContext(context),
            note: context.emergencyNote ?? undefined,
          },
        }),
        onDone: {
          target: 'emergencyOverride',
          actions: assign({
            qrPayload: ({ event }) => event.output,
            lastError: () => null,
          }),
        },
        onError: {
          target: 'emergencyQrFailed',
          actions: assign({
            lastError: ({ event }) => normalizeError(event.error),
          }),
        },
      },
    },
    emergencyQrFailed: {
      on: {
        RETRY_SAVE: {
          guard: 'terminalLogRetrySafe',
          target: 'generatingEmergencyQr',
        },
      },
    },
    completed: {
      on: {},
    },
    emergencyOverride: {
      on: {},
    },
  },
});
