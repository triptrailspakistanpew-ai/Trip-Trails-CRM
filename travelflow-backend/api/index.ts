import { Request, Response } from "express";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

let isConnected = false;
const app = createApp();

export default async function handler(req: Request, res: Response) {
  if (!isConnected) {
    await prisma.$connect();
    isConnected = true;
  }
  return app(req, res);
}
