export const RESPONSE_MESSAGES = {
  AUTH: {
    UNAUTHORIZED: {
      code: 'UNAUTHORIZED',
      message: 'You are not authorized to perform this action.',
    },
    OTP: {
      VERFIED: {
        code: 'OTP_VERIFIED',
        message: 'OTP verified successfully',
      },
      EXPIRED: {
        code: 'OTP_EXPIRED',
        message: 'OTP has expired',
      },
      INVALID: {
        code: 'OTP_INVALID',
        message: 'Invalid email or OTP',
      },
      REQUEST: {
        SUCCESS: {
          code: 'OTP_REQUEST_SUCCESS',
          message: 'OTP requested successfully',
        },
        RESENT: {
          code: 'OTP_RESENT',
          message: 'OTP resent successfully',
        },
        EMAIL_ALREADY_EXISTS: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'Email already exists',
        },
        already_sent: {
          code: 'OTP_ALREADY_SENT',
          message: (seconds: number) =>
            `Otp already sent. Try again after ${seconds} seconds`,
        },
      },
      LOGIN_SUCCESS: {
        code: 'LOGIN_SUCCESS',
        message: 'Login completed successfully.',
      },
      LOGOUT_SUCCESS: {
        code: 'LOGOUT_SUCCESS',
        message: 'Logout completed successfully.',
      },
      INVALID_CREDENTIALS: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      },
    },
    login: {
      SUCCESS: {
        code: 'LOGIN_SUCCESS',
        message: 'Login completed successfully.',
      },
      FAIL: {
        INVALID_CREDENTIALS: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid credentials.',
        },
      },
    },
    oauth: {
      LINK: {
        SUCCESS: {
          code: 'GITHUB_LINK_SUCCESS',
          message: 'GitHub account linked successfully.',
        },
        FAIL: {
          INVALID_OAUTH_RESPONSE: {
            code: 'INVALID_OAUTH_RESPONSE',
            message: 'Invalid GitHub response.',
          },
          ACCOUNT_ALREADY_LINKED: {
            code: 'GITHUB_ACCOUNT_ALREADY_LINKED',
            message: 'This GitHub account is already linked to another user.',
          },
          INVALID_TOKEN: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired authentication token.',
          },
          EMAIL_REQUIRED: {
            code: 'GITHUB_EMAIL_REQUIRED',
            message: 'GitHub email is required to complete authentication.',
          },
        },
      },
    },
  },
  USER: {
    FETCH_SUCCESS: {
      code: 'USER_PROFILE_FETCHED',
      message: 'User profile retrieved successfully.',
    },
    CREATE: {
      SUCCESS: {
        code: 'USER_CREATE_SUCCESS',
        message: 'User created successfully',
      },
      FAIL: {
        INVALID_TOKEN: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token.',
        },
        USER_ALREADY_EXISTS: {
          code: 'USER_ALREADY_EXISTS',
          message: 'User already exists.',
        },
      },
    },
    NOTFOUND: {
      code: 'USER_NOT_FOUND',
      message: 'User not found',
    },
  },
  PROJECT: {
    FETCH_SUCCESS: {
      code: 'PROJECT_FETCH_SUCCESS',
      message: 'Project(s) retrieved successfully.',
    },
    CREATE: {
      SUCCESS: {
        code: 'PROJECT_CREATE_SUCCESS',
        message: 'Project created successfully.',
      },
    },
    DELETE_SUCCESS: {
      code: 'PROJECT_DELETE_SUCCESS',
      message: 'Project deleted successfully.',
    },
    NOT_FOUND: {
      code: 'PROJECT_NOT_FOUND',
      message: 'Project not found.',
    },
    UPDATE_SUCCESS: {
      code: 'PROJECT_UPDATE_SUCCESS',
      message: 'Project updated successfully.',
    }
  },
} as const;
