import express from "express";
import { saveTemplate, getTemplate } from "../controllers/templateController.js";

const router = express.Router();
router.post("/save", saveTemplate);
router.get("/latest", getTemplate);

export default router;
