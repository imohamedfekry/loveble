import { inngest } from "../client";
export const sendEmail = inngest.createFunction(
  {
    id: "send-email",
    retries: 3,
    triggers: [{ event: "email/send" }],
  },
  async ({ event, step }) => {
    await step.run("send", async () => {
      console.log("Sending to:", event.data.email);
    });
  }
);