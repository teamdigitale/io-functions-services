import { Context } from "@azure/functions";
import * as cors from "cors";
import * as express from "express";
import { cosmosdbInstance } from "../utils/cosmosdb";

import {
  SERVICE_COLLECTION_NAME,
  ServiceModel
} from "@pagopa/io-functions-commons/dist/src/models/service";
import { secureExpressApp } from "@pagopa/io-functions-commons/dist/src/utils/express";
import { setAppContext } from "@pagopa/io-functions-commons/dist/src/utils/middlewares/context_middleware";

import createAzureFunctionHandler from "io-functions-express/dist/src/createAzureFunctionsHandler";

import { apiClient } from "../clients/admin";
import { CreateService } from "./handler";

import { initTelemetryClient } from "../utils/appinsights";
import { getConfigOrThrow } from "../utils/config";

const config = getConfigOrThrow();

// Setup Express
const app = express();
secureExpressApp(app);

// Set up CORS (free access to the API from browser clients)
app.use(cors());

const serviceModel = new ServiceModel(
  cosmosdbInstance.container(SERVICE_COLLECTION_NAME)
);

const telemetryClient = initTelemetryClient(
  config.APPINSIGHTS_INSTRUMENTATIONKEY
);

app.post(
  "/api/v1/services",
  CreateService(
    telemetryClient,
    serviceModel,
    apiClient,
    config.DEFAULT_SUBSCRIPTION_PRODUCT_NAME,
    config.SANDBOX_FISCAL_CODE
  )
);

const azureFunctionHandler = createAzureFunctionHandler(app);

// Binds the express app to an Azure Function handler
function httpStart(context: Context): void {
  setAppContext(app, context);
  azureFunctionHandler(context);
}

export default httpStart;
