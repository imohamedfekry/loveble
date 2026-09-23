import { captureErrors } from './capture-errors';

jest.mock('@sentry/nestjs', () => ({
  withScope: jest.fn((cb: (scope: { setExtra: jest.Mock }) => void) => {
    cb({ setExtra: jest.fn() });
  }),
  captureException: jest.fn(),
}));

describe('captureErrors', () => {
  it('returns the resolved value on success', async () => {
    await expect(captureErrors(async () => 7)).resolves.toBe(7);
  });

  it('rethrown failures are reported to Sentry with extras', async () => {
    const Sentry = jest.requireMock('@sentry/nestjs') as {
      captureException: jest.Mock;
      withScope: jest.Mock;
    };
    const err = new Error('boom');

    await expect(
      captureErrors(async () => {
        throw err;
      }, { jobId: 'abc' }),
    ).rejects.toThrow('boom');

    expect(Sentry.withScope).toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledWith(err);
  });
});
