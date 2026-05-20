import { Injectable } from "@nestjs/common";
import { inngest } from "./client";
@Injectable()
export class InngestService {
  async send(name: string, data: any) {
    return inngest.send({ name, data });
  }
}