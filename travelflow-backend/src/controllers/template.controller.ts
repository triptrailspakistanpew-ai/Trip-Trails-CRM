import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as templateService from "../services/template.service";
import { TemplateType } from "../services/template.service";

export const getTemplates = asyncHandler(async (req: Request, res: Response) => {
  const agencyId = (req as any).agencyId as string;
  const templates = await templateService.getTemplates(
    { agencyId },
    req.query.type as TemplateType
  );
  res.json({ data: templates });
});

export const createTemplate = asyncHandler(async (req: Request, res: Response) => {
  const agencyId = (req as any).agencyId as string;
  const template = await templateService.createTemplate({
    agencyId,
    name: req.body.name,
    type: req.body.type,
    content: req.body.content,
  });
  res.status(201).json({ data: template });
});

export const updateTemplate = asyncHandler(async (req: Request, res: Response) => {
  const agencyId = (req as any).agencyId as string;
  const template = await templateService.updateTemplate({
    agencyId,
    templateId: req.params.id,
    name: req.body.name,
    type: req.body.type,
    content: req.body.content,
  });
  res.json({ data: template });
});

export const deleteTemplate = asyncHandler(async (req: Request, res: Response) => {
  const agencyId = (req as any).agencyId as string;
  const result = await templateService.deleteTemplate({
    agencyId,
    templateId: req.params.id,
  });
  res.json({ data: result });
});
