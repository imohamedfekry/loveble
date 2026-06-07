import { inngest } from "../client";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = inngest.createFunction(
  {
    id: "send-email",
    retries: 3,
    triggers: [{ event: "email/send" }],
  },
  async ({ event, step }) => {
    await step.run("send-email", async () => {
      const { email, subject, html } = event.data;

      const response = await resend.emails.send({
        from: "MyApp <onboarding@resend.dev>",
        to: email,
        subject,
        html,
      });

      console.log(response);

      return {
        success: true,
        messageId: response.data?.id,
        response: "Email sent successfully",

      };
    });
  }
);