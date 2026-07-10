import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import chatRouter from "./chat";
import queueRouter from "./queue";
import youtubeRouter from "./youtube";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(chatRouter);
router.use(queueRouter);
router.use(youtubeRouter);

export default router;
