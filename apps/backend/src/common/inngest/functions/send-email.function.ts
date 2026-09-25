import { inngest } from '../client';
import { Resend } from 'resend';
import { OtpTemplate } from '../templates/otp';

const templates = {
  otp: OtpTemplate,
};

type TemplateName = keyof typeof templates;

export const sendEmailFunction = inngest.createFunction(
  {
    id: 'send-email',
    name: 'Send Email',
    retries: 2,
    triggers: [{ event: 'email/send' }],
  },
  async ({ event, step }) => {
    const to = String(event.data?.to ?? '');
    const templateName = String(event.data?.template ?? '');
    const templateData = event.data?.templateData ?? {};

    if (!to || !templateName) {
      throw new Error('send-email job requires to and template');
    }

    return step.run('render-and-send', async () => {
      const template = templates[templateName as TemplateName];
      if (!template) {
        throw new Error(`Template "${templateName}" not found`);
      }

      const html = template(templateData as Record<string, string>);
      const resend = new Resend(process.env.RESEND_API_KEY);

      const { data, error } = await resend.emails.send({
        from: 'Loveble <noreply@resend.dev>',
        to,
        subject: 'Loveble - Verification Code',
        html,
      });

      if (error) {
        throw new Error(`Failed to send email: ${error.message}`);
      }

      return { success: true, data };
    });
  },
);
