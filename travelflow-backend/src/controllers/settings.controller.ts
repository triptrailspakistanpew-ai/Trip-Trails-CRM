import { Request, Response } from "express";
import { ApiResponse } from "../utils/ApiResponse";
import * as settingsService from "../services/settings.service";

export async function getSettings(req: Request, res: Response) {
  const agencyId = (req as any).agencyId;
  const settings = await settingsService.getSettings(agencyId);
  ApiResponse.success(res, settings);
}

export async function updateSettings(req: Request, res: Response) {
  const agencyId = (req as any).agencyId;
  const settings = await settingsService.updateSettings(agencyId, req.body);
  ApiResponse.success(res, settings);
}
