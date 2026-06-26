import express from "express";
import { woocommerceRouter } from "./routes/woocommerce";
import { googleformsRouter } from "./routes/googleforms";
import { portcodeRouter } from "./routes/portcode";
import { googleFormsIntegrationRouter } from "./integrations/googleForms/routes";

export const apiRouter = express.Router();

// Mount split modular plugin routers under the same central router
apiRouter.use(woocommerceRouter);
apiRouter.use(googleformsRouter);
apiRouter.use(portcodeRouter);
apiRouter.use(googleFormsIntegrationRouter);
