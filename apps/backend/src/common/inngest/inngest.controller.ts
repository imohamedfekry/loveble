import { Controller, All, Req, Res, Get } from "@nestjs/common";
import { serve } from "inngest/express";
import { sendEmail } from "./functions/sendEmail.function";
import { inngest } from "./client";

const handler = serve({
  client: inngest,
  functions: [sendEmail],
});

@Controller("inngest")
export class InngestController {
  @All()
  handle(@Req() req, @Res() res) {
    return handler(req, res);
  }
  @Get("test")
    async test() {
        return 'Hello Inngest!'
    }
}