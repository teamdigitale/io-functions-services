/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { BlockedInboxOrChannelEnum } from "@pagopa/io-functions-commons/dist/generated/definitions/BlockedInboxOrChannel";
import { CreatedMessageEvent } from "@pagopa/io-functions-commons/dist/src/models/created_message_event";
import {
  ProfileModel,
  RetrievedProfile
} from "@pagopa/io-functions-commons/dist/src/models/profile";
import { ServicesPreferencesModel } from "@pagopa/io-functions-commons/dist/src/models/service_preference";
import { UTCISODateFromString } from "@pagopa/ts-commons/lib/dates";
import {
  NonNegativeInteger,
  NonNegativeNumber
} from "@pagopa/ts-commons/lib/numbers";
import { fromLeft } from "fp-ts/lib/IOEither";
import { none, some, Option } from "fp-ts/lib/Option";
import { taskEither } from "fp-ts/lib/TaskEither";
import { CosmosErrors } from "@pagopa/io-functions-commons/dist/src/utils/cosmosdb_model";
import {
  makeServicesPreferencesDocumentId,
  ServicePreference
} from "@pagopa/io-functions-commons/dist/src/models/service_preference";
import { ServicesPreferencesModel } from "@pagopa/io-functions-commons/dist/src/models/service_preference";
import {
  aCreatedMessageEventSenderMetadata,
  aDisabledServicePreference,
  aMessageContent,
  anEnabledServicePreference,
  aNewMessageWithoutContent,
  aRetrievedMessage,
  aRetrievedProfile,
  autoProfileServicePreferencesSettings,
  legacyProfileServicePreferencesSettings,
  manualProfileServicePreferencesSettings
} from "../../__mocks__/mocks";
import {
  getStoreMessageContentActivityHandler,
  StoreMessageContentActivityResult
} from "../handler";
import { NonEmptyString } from "@pagopa/io-functions-commons/node_modules/@pagopa/ts-commons/lib/strings";

const mockContext = {
  // eslint-disable no-console
  log: {
    error: console.error,
    info: console.log,
    verbose: console.log,
    warn: console.warn
  }
} as any;

const findLastProfileVersionByModelIdMock = jest
  .fn()
  .mockImplementation(() => taskEither.of(some(aRetrievedProfile)));

const profileModelMock = {
  findLastVersionByModelId: jest.fn(findLastProfileVersionByModelIdMock)
};

const aBlobResult = {
  name: "ABlobName"
};

const storeContentAsBlobMock = jest
  .fn()
  .mockImplementation(() => taskEither.of(some(aBlobResult)));

const upsertMessageMock = jest
  .fn()
  .mockImplementation(() => taskEither.of(aRetrievedMessage));

const messageModelMock = {
  storeContentAsBlob: storeContentAsBlobMock,
  upsert: upsertMessageMock
};

const findServicePreferenceMock = jest.fn<any, any>(() =>
  taskEither.of(some(aRetrievedServicePreference))
);
const servicePreferenceMock = ({
  find: findServicePreferenceMock
} as unknown) as ServicesPreferencesModel;

const anOptOutEmailSwitchDate = UTCISODateFromString.decode(
  "2021-07-08T23:59:59Z"
).getOrElseL(() => fail("wrong date value"));

const aPastOptOutEmailSwitchDate = UTCISODateFromString.decode(
  "2000-07-08T23:59:59Z"
).getOrElseL(() => fail("wrong date value"));

const aCreatedMessageEvent: CreatedMessageEvent = {
  content: aMessageContent,
  message: aNewMessageWithoutContent,
  senderMetadata: aCreatedMessageEventSenderMetadata,
  serviceVersion: 1 as NonNegativeNumber
};

const aRetrievedProfileWithAValidTimestamp = {
  ...aRetrievedProfile,
  _ts: 1625172947000
};

const findServicePreferenceMock = jest
  .fn()
  .mockImplementation(([modelId, partitionKey]) =>
    taskEither.of<CosmosErrors, Option<ServicePreference>>(none)
  );

const mockServicesPreferencesModel = ({
  find: findServicePreferenceMock
} as any) as ServicesPreferencesModel;

const handlerInputMock = {
  isOptInEmailEnabled: true,
  lBlobService: {} as any,
  lMessageModel: messageModelMock as any,
  lProfileModel: profileModelMock as any,
  lServicePreferencesModel: mockServicesPreferencesModel as any,
  optOutEmailSwitchDate: anOptOutEmailSwitchDate
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getStoreMessageContentActivityHandler", () => {
  it("should respond success with a retrieved profile with isEmailEnabled to false", async () => {
    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      handlerInputMock
    );

    const result = await storeMessageContentActivityHandler(
      mockContext,
      aCreatedMessageEvent
    );

    expect(result.kind).toBe("SUCCESS");
    if (result.kind === "SUCCESS") {
      expect(result.blockedInboxOrChannels).toEqual([]);
      expect(result.profile).toEqual({
        ...aRetrievedProfile,
        isEmailEnabled: false
      });
    }
  });

  it("should respond success with a retrieved profile mantaining its original isEmailEnabled property with Feature flag disabled", async () => {
    findLastProfileVersionByModelIdMock.mockImplementationOnce(() =>
      taskEither.of(some(aRetrievedProfileWithAValidTimestamp))
    );
    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, isOptInEmailEnabled: false }
    );

    const result = await storeMessageContentActivityHandler(
      mockContext,
      aCreatedMessageEvent
    );

    expect(result.kind).toBe("SUCCESS");
    if (result.kind === "SUCCESS") {
      expect(result.blockedInboxOrChannels).toEqual([]);
      expect(result.profile).toEqual(aRetrievedProfileWithAValidTimestamp);
    }
  });

  it("should respond success with a retrieved profile mantaining its original isEmailEnabled property", async () => {
    findLastProfileVersionByModelIdMock.mockImplementationOnce(() =>
      taskEither.of(some(aRetrievedProfileWithAValidTimestamp))
    );
    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, optOutEmailSwitchDate: aPastOptOutEmailSwitchDate }
    );

    const result = await storeMessageContentActivityHandler(
      mockContext,
      aCreatedMessageEvent
    );

const aRetrievedProfileWithManualPreferences = {
  ...aRetrievedProfileWithAValidTimestamp,
  servicePreferencesSettings: manualProfileServicePreferencesSettings
};

  it("should fail if activity input cannot be decoded", async () => {
    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, optOutEmailSwitchDate: aPastOptOutEmailSwitchDate }
    );

// utility that adds a given set of serviceIds to the profile's inbox blacklist
const withBlacklist = (profile: RetrievedProfile, services = []) => ({
  ...profile,
  blockedInboxOrChannels: services.reduce(
    (obj, serviceId) => ({
      ...obj,
      [serviceId]: [BlockedInboxOrChannelEnum.INBOX]
    }),
    {}
  )
});

const withBlockedEmail = (profile: RetrievedProfile, services = []) => ({
  ...profile,
  blockedInboxOrChannels: services.reduce(
    (obj, serviceId) => ({
      ...obj,
      [serviceId]: [BlockedInboxOrChannelEnum.EMAIL]
    }),
    {}
  )
});
describe("getStoreMessageContentActivityHandler", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should throw an Error if there is an error while fetching profile", async () => {
    findLastProfileVersionByModelIdMock.mockImplementationOnce(() =>
      fromLeft("Profile fetch error")
    );
    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, optOutEmailSwitchDate: aPastOptOutEmailSwitchDate }
    );

      const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
        profileModelMock as any,
        messageModelMock as any,
        {} as any,
        servicePreferenceMock,
        aPastOptOutEmailSwitchDate
      );

  it("should fail if no profile was found", async () => {
    findLastProfileVersionByModelIdMock.mockImplementationOnce(() =>
      taskEither.of(none)
    );
    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, optOutEmailSwitchDate: aPastOptOutEmailSwitchDate }
    );

      expect(result.kind).toBe("SUCCESS");
      if (result.kind === "SUCCESS") {
        expect(result.blockedInboxOrChannels).toEqual(expectedBIOC);
        expect(result.profile).toEqual(profileResult);
      }

      // success means message has been stored and status has been updated
      expect(upsertMessageMock).toHaveBeenCalledTimes(1);
      expect(storeContentAsBlobMock).toHaveBeenCalledTimes(1);
    }
  );

  it("should fail if inbox is not enabled", async () => {
    findLastProfileVersionByModelIdMock.mockImplementationOnce(() =>
      taskEither.of(some({ ...aRetrievedProfile, isInboxEnabled: false }))
    );
    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, optOutEmailSwitchDate: aPastOptOutEmailSwitchDate }
    );

      const result = await storeMessageContentActivityHandler(
        mockContext,
        messageEvent
      );

    expect(result.kind).toBe("FAILURE");
    if (result.kind === "FAILURE") {
      expect(result.reason).toEqual("MASTER_INBOX_DISABLED");
    }
  });

  it("should fail if message sender is blocked", async () => {
    findLastProfileVersionByModelIdMock.mockImplementationOnce(() =>
      taskEither.of(
        some({
          ...aRetrievedProfile,
          blockedInboxOrChannels: {
            myService: [BlockedInboxOrChannelEnum.INBOX]
          }
        })
      )
    );
    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, optOutEmailSwitchDate: aPastOptOutEmailSwitchDate }
    );

    const result = await storeMessageContentActivityHandler(mockContext, {
      ...aCreatedMessageEvent,
      message: {
        ...aNewMessageWithoutContent,
        senderServiceId: "myService" as ServiceId
      }
    });

      // check if models are being used only when expected
      expect(findLastVersionByModelIdMock).toBeCalledTimes(
        skipProfileMock ? 0 : 1
      );
      expect(findServicePreferenceMock).toBeCalledTimes(
        skipPreferenceMock ? 0 : 1
      );
    }
  );

  it("should throw an Error if message store operation fails", async () => {
    storeContentAsBlobMock.mockImplementationOnce(() =>
      fromLeft(new Error("Error while storing message content"))
    );
    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, optOutEmailSwitchDate: aPastOptOutEmailSwitchDate }
    );

      const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
        profileModelMock as any,
        messageModelMock as any,
        {} as any,
        servicePreferenceMock,
        aPastOptOutEmailSwitchDate
      );

  it("should throw an Error if message upsert fails", async () => {
    upsertMessageMock.mockImplementationOnce(() =>
      fromLeft(new Error("Error while upserting message"))
    );
    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, optOutEmailSwitchDate: aPastOptOutEmailSwitchDate }
    );

    await expect(
      storeMessageContentActivityHandler(mockContext, aCreatedMessageEvent)
    ).rejects.toThrow();
  });

  it("should throw an Error if user's service preference retrieval fails (AUTO SETTINGS)", async () => {
    findLastProfileVersionByModelIdMock.mockImplementationOnce(() =>
      taskEither.of(
        some({
          ...aRetrievedProfile,
          servicePreferencesSettings: autoProfileServicePreferencesSettings,
          blockedInboxOrChannels: {
            "01234567890": [BlockedInboxOrChannelEnum.INBOX]
          }
        })
      )
    );

    findServicePreferenceMock.mockImplementationOnce(
      ([modelId, partitionKey]) => fromLeft({ kind: "COSMOS_EMPTY_RESPONSE" })
    );

    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, optOutEmailSwitchDate: aPastOptOutEmailSwitchDate }
    );

    await expect(
      storeMessageContentActivityHandler(mockContext, aCreatedMessageEvent)
    ).rejects.toThrow();

    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalled();
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledTimes(1);
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledWith([
      aRetrievedProfile.fiscalCode
    ]);

    const documentId = makeServicesPreferencesDocumentId(
      aRetrievedProfile.fiscalCode,
      aCreatedMessageEvent.message.senderServiceId,
      autoProfileServicePreferencesSettings.version as NonNegativeInteger
    );
    expect(findServicePreferenceMock).toHaveBeenCalled();
    expect(findServicePreferenceMock).toHaveBeenCalledTimes(1);
    expect(findServicePreferenceMock).toHaveBeenCalledWith([
      documentId,
      aRetrievedProfile.fiscalCode
    ]);
  });

  it("should succeed with empty blockedInboxOrChannels if message sender service does not exists in user service preference (AUTO SETTINGS)", async () => {
    findLastProfileVersionByModelIdMock.mockImplementationOnce(() =>
      taskEither.of(
        some({
          ...aRetrievedProfile,
          servicePreferencesSettings: autoProfileServicePreferencesSettings,
          blockedInboxOrChannels: {
            "01234567890": [BlockedInboxOrChannelEnum.INBOX]
          }
        })
      )
    );

    findServicePreferenceMock.mockImplementationOnce(
      ([modelId, partitionKey]) =>
        taskEither.of<CosmosErrors, Option<ServicePreference>>(none)
    );

    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, optOutEmailSwitchDate: aPastOptOutEmailSwitchDate }
    );

    const result: StoreMessageContentActivityResult = await storeMessageContentActivityHandler(
      mockContext,
      {
        ...aCreatedMessageEvent,
        message: {
          ...aNewMessageWithoutContent,
          senderServiceId: "01234567890" as ServiceId
        }
      }
    );

    expect(result.kind).toBe("SUCCESS");
    if (result.kind === "SUCCESS") {
      // we expect that blockedInboxOrChannels is overridden by AUTO setting
      expect(result.blockedInboxOrChannels).toEqual([]);
    }

    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalled();
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledTimes(1);
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledWith([
      aRetrievedProfile.fiscalCode
    ]);

    const documentId = makeServicesPreferencesDocumentId(
      aRetrievedProfile.fiscalCode,
      "01234567890" as NonEmptyString,
      autoProfileServicePreferencesSettings.version as NonNegativeInteger
    );
    expect(findServicePreferenceMock).toHaveBeenCalled();
    expect(findServicePreferenceMock).toHaveBeenCalledTimes(1);
    expect(findServicePreferenceMock).toHaveBeenCalledWith([
      documentId,
      aRetrievedProfile.fiscalCode
    ]);
  });

  it("should succeed with empty blockedInboxOrChannels if message sender service exists and is enabled in user service preference (AUTO SETTINGS)", async () => {
    findLastProfileVersionByModelIdMock.mockImplementationOnce(() =>
      taskEither.of(
        some({
          ...aRetrievedProfile,
          servicePreferencesSettings: autoProfileServicePreferencesSettings,
          blockedInboxOrChannels: {
            "01234567890": [BlockedInboxOrChannelEnum.INBOX]
          }
        })
      )
    );

    findServicePreferenceMock.mockImplementationOnce(
      ([modelId, partitionKey]) =>
        taskEither.of<CosmosErrors, Option<ServicePreference>>(
          some({
            ...anEnabledServicePreference,
            version: autoProfileServicePreferencesSettings.version
          })
        )
    );

    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, optOutEmailSwitchDate: aPastOptOutEmailSwitchDate }
    );

    const result: StoreMessageContentActivityResult = await storeMessageContentActivityHandler(
      mockContext,
      {
        ...aCreatedMessageEvent,
        message: {
          ...aNewMessageWithoutContent,
          senderServiceId: "01234567890" as ServiceId
        }
      }
    );

    expect(result.kind).toBe("SUCCESS");
    if (result.kind === "SUCCESS") {
      // we expect that blockedInboxOrChannels is overridden by AUTO setting
      // with service preferences
      expect(result.blockedInboxOrChannels).toEqual([]);
    }

    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalled();
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledTimes(1);
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledWith([
      aRetrievedProfile.fiscalCode
    ]);

    const documentId = makeServicesPreferencesDocumentId(
      aRetrievedProfile.fiscalCode,
      "01234567890" as NonEmptyString,
      autoProfileServicePreferencesSettings.version as NonNegativeInteger
    );
    expect(findServicePreferenceMock).toHaveBeenCalled();
    expect(findServicePreferenceMock).toHaveBeenCalledTimes(1);
    expect(findServicePreferenceMock).toHaveBeenCalledWith([
      documentId,
      aRetrievedProfile.fiscalCode
    ]);
  });

  it("should succeed with a blocked EMAIL if sender service exists and has EMAIL disabled in user service preference (AUTO SETTINGS)", async () => {
    findLastProfileVersionByModelIdMock.mockImplementationOnce(() =>
      taskEither.of(
        some({
          ...aRetrievedProfile,
          servicePreferencesSettings: autoProfileServicePreferencesSettings,
          blockedInboxOrChannels: {
            "01234567890": [BlockedInboxOrChannelEnum.INBOX] // this will not be considered
          }
        })
      )
    );

    findServicePreferenceMock.mockImplementationOnce(
      ([modelId, partitionKey]) =>
        taskEither.of<CosmosErrors, Option<ServicePreference>>(
          some({
            ...anEnabledServicePreference,
            isEmailEnabled: false, // we disable email for this test
            version: autoProfileServicePreferencesSettings.version
          })
        )
    );

    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, optOutEmailSwitchDate: aPastOptOutEmailSwitchDate }
    );

    const result: StoreMessageContentActivityResult = await storeMessageContentActivityHandler(
      mockContext,
      {
        ...aCreatedMessageEvent,
        message: {
          ...aNewMessageWithoutContent,
          senderServiceId: "01234567890" as ServiceId
        }
      }
    );

    expect(result.kind).toBe("SUCCESS");
    if (result.kind === "SUCCESS") {
      // we expect that blockedInboxOrChannels is overridden by AUTO setting
      // with service preferences with disabled EMAIL
      expect(result.blockedInboxOrChannels).toEqual([
        BlockedInboxOrChannelEnum.EMAIL
      ]);
    }

    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalled();
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledTimes(1);
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledWith([
      aRetrievedProfile.fiscalCode
    ]);

    const documentId = makeServicesPreferencesDocumentId(
      aRetrievedProfile.fiscalCode,
      "01234567890" as NonEmptyString,
      autoProfileServicePreferencesSettings.version as NonNegativeInteger
    );
    expect(findServicePreferenceMock).toHaveBeenCalled();
    expect(findServicePreferenceMock).toHaveBeenCalledTimes(1);
    expect(findServicePreferenceMock).toHaveBeenCalledWith([
      documentId,
      aRetrievedProfile.fiscalCode
    ]);
  });

  it("should fail if message sender service exists and is not enabled in user service preference (AUTO SETTINGS)", async () => {
    findLastProfileVersionByModelIdMock.mockImplementationOnce(() =>
      taskEither.of(
        some({
          ...aRetrievedProfile,
          servicePreferencesSettings: autoProfileServicePreferencesSettings,
          blockedInboxOrChannels: {
            "01234567890": [BlockedInboxOrChannelEnum.INBOX]
          }
        })
      )
    );

    findServicePreferenceMock.mockImplementationOnce(
      ([modelId, partitionKey]) =>
        taskEither.of<CosmosErrors, Option<ServicePreference>>(
          some({
            ...aDisabledServicePreference,
            version: autoProfileServicePreferencesSettings.version
          })
        )
    );

    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, optOutEmailSwitchDate: aPastOptOutEmailSwitchDate }
    );

    const result: StoreMessageContentActivityResult = await storeMessageContentActivityHandler(
      mockContext,
      {
        ...aCreatedMessageEvent,
        message: {
          ...aNewMessageWithoutContent,
          senderServiceId: "01234567890" as ServiceId
        }
      }
    );

    expect(result.kind).toBe("FAILURE");
    if (result.kind === "FAILURE") {
      expect(result.reason).toEqual("SENDER_BLOCKED");
    }

    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalled();
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledTimes(1);
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledWith([
      aRetrievedProfile.fiscalCode
    ]);

    const documentId = makeServicesPreferencesDocumentId(
      aRetrievedProfile.fiscalCode,
      "01234567890" as NonEmptyString,
      autoProfileServicePreferencesSettings.version as NonNegativeInteger
    );
    expect(findServicePreferenceMock).toHaveBeenCalled();
    expect(findServicePreferenceMock).toHaveBeenCalledTimes(1);
    expect(findServicePreferenceMock).toHaveBeenCalledWith([
      documentId,
      aRetrievedProfile.fiscalCode
    ]);
  });

  it("should fail if message sender service exists and has INBOX disabled in user service preference (AUTO SETTINGS)", async () => {
    findLastProfileVersionByModelIdMock.mockImplementationOnce(() =>
      taskEither.of(
        some({
          ...aRetrievedProfile,
          servicePreferencesSettings: autoProfileServicePreferencesSettings,
          blockedInboxOrChannels: {
            "01234567890": [] // this will not be considered
          }
        })
      )
    );

    findServicePreferenceMock.mockImplementationOnce(
      ([modelId, partitionKey]) =>
        taskEither.of<CosmosErrors, Option<ServicePreference>>(
          some({
            ...aDisabledServicePreference,
            isEmailEnabled: true,
            isWebhookEnabled: true,
            version: autoProfileServicePreferencesSettings.version
          })
        )
    );

    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, optOutEmailSwitchDate: aPastOptOutEmailSwitchDate }
    );

    const result: StoreMessageContentActivityResult = await storeMessageContentActivityHandler(
      mockContext,
      {
        ...aCreatedMessageEvent,
        message: {
          ...aNewMessageWithoutContent,
          senderServiceId: "01234567890" as ServiceId
        }
      }
    );

    expect(result.kind).toBe("FAILURE");
    if (result.kind === "FAILURE") {
      expect(result.reason).toEqual("SENDER_BLOCKED");
    }

    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalled();
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledTimes(1);
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledWith([
      aRetrievedProfile.fiscalCode
    ]);

    const documentId = makeServicesPreferencesDocumentId(
      aRetrievedProfile.fiscalCode,
      "01234567890" as NonEmptyString,
      autoProfileServicePreferencesSettings.version as NonNegativeInteger
    );
    expect(findServicePreferenceMock).toHaveBeenCalled();
    expect(findServicePreferenceMock).toHaveBeenCalledTimes(1);
    expect(findServicePreferenceMock).toHaveBeenCalledWith([
      documentId,
      aRetrievedProfile.fiscalCode
    ]);
  });

  it("should throw an Error if user's service preference retrieval fails (MANUAL SETTINGS)", async () => {
    findLastProfileVersionByModelIdMock.mockImplementationOnce(() =>
      taskEither.of(
        some({
          ...aRetrievedProfile,
          servicePreferencesSettings: manualProfileServicePreferencesSettings,
          blockedInboxOrChannels: {
            "01234567890": [BlockedInboxOrChannelEnum.INBOX]
          }
        })
      )
    );

    findServicePreferenceMock.mockImplementationOnce(
      ([modelId, partitionKey]) => fromLeft({ kind: "COSMOS_EMPTY_RESPONSE" })
    );

    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, optOutEmailSwitchDate: aPastOptOutEmailSwitchDate }
    );

    await expect(
      storeMessageContentActivityHandler(mockContext, aCreatedMessageEvent)
    ).rejects.toThrow();

    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalled();
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledTimes(1);
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledWith([
      aRetrievedProfile.fiscalCode
    ]);

    const documentId = makeServicesPreferencesDocumentId(
      aRetrievedProfile.fiscalCode,
      aCreatedMessageEvent.message.senderServiceId,
      manualProfileServicePreferencesSettings.version as NonNegativeInteger
    );
    expect(findServicePreferenceMock).toHaveBeenCalled();
    expect(findServicePreferenceMock).toHaveBeenCalledTimes(1);
    expect(findServicePreferenceMock).toHaveBeenCalledWith([
      documentId,
      aRetrievedProfile.fiscalCode
    ]);
  });

  it("should fail if message sender service does not exists in user service preference (MANUAL SETTINGS)", async () => {
    findLastProfileVersionByModelIdMock.mockImplementationOnce(() =>
      taskEither.of(
        some({
          ...aRetrievedProfile,
          servicePreferencesSettings: manualProfileServicePreferencesSettings,
          blockedInboxOrChannels: {
            "01234567890": [] // this will not be considered
          }
        })
      )
    );

    findServicePreferenceMock.mockImplementationOnce(
      ([modelId, partitionKey]) =>
        taskEither.of<CosmosErrors, Option<ServicePreference>>(none)
    );

    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, optOutEmailSwitchDate: aPastOptOutEmailSwitchDate }
    );

    const result: StoreMessageContentActivityResult = await storeMessageContentActivityHandler(
      mockContext,
      {
        ...aCreatedMessageEvent,
        message: {
          ...aNewMessageWithoutContent,
          senderServiceId: "01234567890" as ServiceId
        }
      }
    );

    expect(result.kind).toBe("FAILURE");
    if (result.kind === "FAILURE") {
      expect(result.reason).toEqual("SENDER_BLOCKED");
    }

    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalled();
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledTimes(1);
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledWith([
      aRetrievedProfile.fiscalCode
    ]);

    const documentId = makeServicesPreferencesDocumentId(
      aRetrievedProfile.fiscalCode,
      "01234567890" as NonEmptyString,
      manualProfileServicePreferencesSettings.version as NonNegativeInteger
    );
    expect(findServicePreferenceMock).toHaveBeenCalled();
    expect(findServicePreferenceMock).toHaveBeenCalledTimes(1);
    expect(findServicePreferenceMock).toHaveBeenCalledWith([
      documentId,
      aRetrievedProfile.fiscalCode
    ]);
  });

  it("should succeed with empty blockedInboxOrChannels if message sender service exists and is enabled in user service preference (MANUAL SETTINGS)", async () => {
    findLastProfileVersionByModelIdMock.mockImplementationOnce(() =>
      taskEither.of(
        some({
          ...aRetrievedProfile,
          servicePreferencesSettings: manualProfileServicePreferencesSettings,
          blockedInboxOrChannels: {
            "01234567890": [BlockedInboxOrChannelEnum.INBOX] // this will not be considered
          }
        })
      )
    );

    findServicePreferenceMock.mockImplementationOnce(
      ([modelId, partitionKey]) =>
        taskEither.of<CosmosErrors, Option<ServicePreference>>(
          some({
            ...anEnabledServicePreference,
            version: manualProfileServicePreferencesSettings.version
          })
        )
    );

    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, optOutEmailSwitchDate: aPastOptOutEmailSwitchDate }
    );

    const result: StoreMessageContentActivityResult = await storeMessageContentActivityHandler(
      mockContext,
      {
        ...aCreatedMessageEvent,
        message: {
          ...aNewMessageWithoutContent,
          senderServiceId: "01234567890" as ServiceId
        }
      }
    );

    expect(result.kind).toBe("SUCCESS");
    if (result.kind === "SUCCESS") {
      expect(result.blockedInboxOrChannels).toEqual([]);
    }

    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalled();
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledTimes(1);
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledWith([
      aRetrievedProfile.fiscalCode
    ]);

    const documentId = makeServicesPreferencesDocumentId(
      aRetrievedProfile.fiscalCode,
      "01234567890" as NonEmptyString,
      manualProfileServicePreferencesSettings.version as NonNegativeInteger
    );
    expect(findServicePreferenceMock).toHaveBeenCalled();
    expect(findServicePreferenceMock).toHaveBeenCalledTimes(1);
    expect(findServicePreferenceMock).toHaveBeenCalledWith([
      documentId,
      aRetrievedProfile.fiscalCode
    ]);
  });

  it("should succeed with blocked EMAIL if message sender service exists and has EMAIL disabled in user service preference (MANUAL SETTINGS)", async () => {
    findLastProfileVersionByModelIdMock.mockImplementationOnce(() =>
      taskEither.of(
        some({
          ...aRetrievedProfile,
          servicePreferencesSettings: manualProfileServicePreferencesSettings,
          blockedInboxOrChannels: {
            "01234567890": [BlockedInboxOrChannelEnum.INBOX] // this will not be considered
          }
        })
      )
    );

    findServicePreferenceMock.mockImplementationOnce(
      ([modelId, partitionKey]) =>
        taskEither.of<CosmosErrors, Option<ServicePreference>>(
          some({
            ...anEnabledServicePreference,
            isEmailEnabled: false,
            version: manualProfileServicePreferencesSettings.version
          })
        )
    );

    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, optOutEmailSwitchDate: aPastOptOutEmailSwitchDate }
    );

    const result: StoreMessageContentActivityResult = await storeMessageContentActivityHandler(
      mockContext,
      {
        ...aCreatedMessageEvent,
        message: {
          ...aNewMessageWithoutContent,
          senderServiceId: "01234567890" as ServiceId
        }
      }
    );

    expect(result.kind).toBe("SUCCESS");
    if (result.kind === "SUCCESS") {
      expect(result.blockedInboxOrChannels).toEqual([
        BlockedInboxOrChannelEnum.EMAIL
      ]);
    }

    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalled();
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledTimes(1);
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledWith([
      aRetrievedProfile.fiscalCode
    ]);

    const documentId = makeServicesPreferencesDocumentId(
      aRetrievedProfile.fiscalCode,
      "01234567890" as NonEmptyString,
      manualProfileServicePreferencesSettings.version as NonNegativeInteger
    );
    expect(findServicePreferenceMock).toHaveBeenCalled();
    expect(findServicePreferenceMock).toHaveBeenCalledTimes(1);
    expect(findServicePreferenceMock).toHaveBeenCalledWith([
      documentId,
      aRetrievedProfile.fiscalCode
    ]);
  });

  it("should fail if message sender service exists and is not enabled in user service preference (MANUAL SETTINGS)", async () => {
    findLastProfileVersionByModelIdMock.mockImplementationOnce(() =>
      taskEither.of(
        some({
          ...aRetrievedProfile,
          servicePreferencesSettings: manualProfileServicePreferencesSettings,
          blockedInboxOrChannels: {
            "01234567890": [BlockedInboxOrChannelEnum.INBOX] // this will not be considered
          }
        })
      )
    );

    findServicePreferenceMock.mockImplementationOnce(
      ([modelId, partitionKey]) =>
        taskEither.of<CosmosErrors, Option<ServicePreference>>(
          some({
            ...aDisabledServicePreference,
            version: manualProfileServicePreferencesSettings.version
          })
        )
    );

    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, optOutEmailSwitchDate: aPastOptOutEmailSwitchDate }
    );

    const result: StoreMessageContentActivityResult = await storeMessageContentActivityHandler(
      mockContext,
      {
        ...aCreatedMessageEvent,
        message: {
          ...aNewMessageWithoutContent,
          senderServiceId: "01234567890" as ServiceId
        }
      }
    );

    expect(result.kind).toBe("FAILURE");
    if (result.kind === "FAILURE") {
      expect(result.reason).toEqual("SENDER_BLOCKED");
    }

    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalled();
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledTimes(1);
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledWith([
      aRetrievedProfile.fiscalCode
    ]);

    const documentId = makeServicesPreferencesDocumentId(
      aRetrievedProfile.fiscalCode,
      "01234567890" as NonEmptyString,
      manualProfileServicePreferencesSettings.version as NonNegativeInteger
    );
    expect(findServicePreferenceMock).toHaveBeenCalled();
    expect(findServicePreferenceMock).toHaveBeenCalledTimes(1);
    expect(findServicePreferenceMock).toHaveBeenCalledWith([
      documentId,
      aRetrievedProfile.fiscalCode
    ]);
  });

  it("should fail if message sender service exists and has INBOX disabled in user service preference (MANUAL SETTINGS)", async () => {
    findLastProfileVersionByModelIdMock.mockImplementationOnce(() =>
      taskEither.of(
        some({
          ...aRetrievedProfile,
          servicePreferencesSettings: manualProfileServicePreferencesSettings,
          blockedInboxOrChannels: {
            "01234567890": [BlockedInboxOrChannelEnum.INBOX]
          }
        })
      )
    );

    findServicePreferenceMock.mockImplementationOnce(
      ([modelId, partitionKey]) =>
        taskEither.of<CosmosErrors, Option<ServicePreference>>(
          some({
            ...anEnabledServicePreference,
            isInboxEnabled: false,
            version: manualProfileServicePreferencesSettings.version
          })
        )
    );

    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, optOutEmailSwitchDate: aPastOptOutEmailSwitchDate }
    );

    const result: StoreMessageContentActivityResult = await storeMessageContentActivityHandler(
      mockContext,
      {
        ...aCreatedMessageEvent,
        message: {
          ...aNewMessageWithoutContent,
          senderServiceId: "01234567890" as ServiceId
        }
      }
    );

    expect(result.kind).toBe("FAILURE");
    if (result.kind === "FAILURE") {
      expect(result.reason).toEqual("SENDER_BLOCKED");
    }

    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalled();
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledTimes(1);
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledWith([
      aRetrievedProfile.fiscalCode
    ]);

    const documentId = makeServicesPreferencesDocumentId(
      aRetrievedProfile.fiscalCode,
      "01234567890" as NonEmptyString,
      manualProfileServicePreferencesSettings.version as NonNegativeInteger
    );
    expect(findServicePreferenceMock).toHaveBeenCalled();
    expect(findServicePreferenceMock).toHaveBeenCalledTimes(1);
    expect(findServicePreferenceMock).toHaveBeenCalledWith([
      documentId,
      aRetrievedProfile.fiscalCode
    ]);
  });

  it("should succeed with empty blockedInboxOrChannels if the service is not in user's blockedInboxOrChannels (LEGACY SETTINGS)", async () => {
    // LEGACY settings should not run any query on service preferences
    // so this should not throw any error because query is not run

    findLastProfileVersionByModelIdMock.mockImplementationOnce(() =>
      taskEither.of(
        some({
          ...aRetrievedProfile,
          servicePreferencesSettings: legacyProfileServicePreferencesSettings,
          blockedInboxOrChannels: {
            ASDFGHJKL: [BlockedInboxOrChannelEnum.INBOX] // this is another service
          }
        })
      )
    );

    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, optOutEmailSwitchDate: aPastOptOutEmailSwitchDate }
    );

    const result: StoreMessageContentActivityResult = await storeMessageContentActivityHandler(
      mockContext,
      {
        ...aCreatedMessageEvent,
        message: {
          ...aNewMessageWithoutContent,
          senderServiceId: "01234567890" as ServiceId
        }
      }
    );

    expect(result.kind).toBe("SUCCESS");
    if (result.kind === "SUCCESS") {
      expect(result.blockedInboxOrChannels).toEqual([]);
    }

    // findServicePreferenceMock is not mocked because it should not be called
    // senderServiceId: "01234567890" is not in blockedInboxOrChannels
    // => SUCCESS
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalled();
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledTimes(1);
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledWith([
      aRetrievedProfile.fiscalCode
    ]);
    expect(findServicePreferenceMock).not.toHaveBeenCalled();
  });

  it("should succeed with a blocked EMAIL for a service in blockedInboxOrChannels with email disabled (LEGACY SETTINGS)", async () => {
    // LEGACY settings should not run any query on service preferences
    // so this should not throw any error because query is not run

    findLastProfileVersionByModelIdMock.mockImplementationOnce(() =>
      taskEither.of(
        some({
          ...aRetrievedProfile,
          servicePreferencesSettings: legacyProfileServicePreferencesSettings,
          blockedInboxOrChannels: {
            "01234567890": [BlockedInboxOrChannelEnum.EMAIL] // email is blocked
          }
        })
      )
    );

    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, optOutEmailSwitchDate: aPastOptOutEmailSwitchDate }
    );

    const result: StoreMessageContentActivityResult = await storeMessageContentActivityHandler(
      mockContext,
      {
        ...aCreatedMessageEvent,
        message: {
          ...aNewMessageWithoutContent,
          senderServiceId: "01234567890" as ServiceId
        }
      }
    );

    expect(result.kind).toBe("SUCCESS");
    if (result.kind === "SUCCESS") {
      expect(result.blockedInboxOrChannels).toEqual([
        BlockedInboxOrChannelEnum.EMAIL
      ]);
    }

    // findServicePreferenceMock is not mocked because it should not be called
    // senderServiceId: "01234567890" is in blockedInboxOrChannels for EMAIL
    // => SUCCESS
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalled();
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledTimes(1);
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledWith([
      aRetrievedProfile.fiscalCode
    ]);
    expect(findServicePreferenceMock).not.toHaveBeenCalled();
  });

  it("should fail for service in blockedInboxOrChannels with blocked INBOX (LEGACY SETTINGS)", async () => {
    // LEGACY settings should not run any query on service preferences
    // so this should not throw any error because query is not run

    findLastProfileVersionByModelIdMock.mockImplementationOnce(() =>
      taskEither.of(
        some({
          ...aRetrievedProfile,
          servicePreferencesSettings: legacyProfileServicePreferencesSettings,
          blockedInboxOrChannels: {
            "01234567890": [BlockedInboxOrChannelEnum.INBOX]
          }
        })
      )
    );

    const storeMessageContentActivityHandler = getStoreMessageContentActivityHandler(
      { ...handlerInputMock, optOutEmailSwitchDate: aPastOptOutEmailSwitchDate }
    );

    const result: StoreMessageContentActivityResult = await storeMessageContentActivityHandler(
      mockContext,
      {
        ...aCreatedMessageEvent,
        message: {
          ...aNewMessageWithoutContent,
          senderServiceId: "01234567890" as ServiceId
        }
      }
    );

    expect(result.kind).toBe("FAILURE");
    if (result.kind === "FAILURE") {
      expect(result.reason).toEqual("SENDER_BLOCKED");
    }

    // findServicePreferenceMock is not mocked because it should not be called
    // senderServiceId: "01234567890" is in blockedInboxOrChannels for INBOX
    // => FAILURE
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalled();
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledTimes(1);
    expect(findLastProfileVersionByModelIdMock).toHaveBeenCalledWith([
      aRetrievedProfile.fiscalCode
    ]);
    expect(findServicePreferenceMock).not.toHaveBeenCalled();
  });
});
