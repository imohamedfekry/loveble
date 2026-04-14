export const RESPONSE_MESSAGES = {
  AUTH: {
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
        USER_ALREADY_EXISTS: {
          code: 'USER_ALREADY_EXISTS',
          message: 'User already exists.',
        },
      },
    },
    ADD_ROLE: {
      SUCCESS: {
        code: 'ROLE_ADDED_SUCCESS',
        message: 'Role added successfully to user.',
      },
      FAIL: {
        code: 'ROLE_ADD_FAILED',
        message: 'Failed to add role to user.',
      },
    },
    REMOVE_ROLE: {
      SUCCESS: {
        code: 'ROLE_REMOVED_SUCCESS',
        message: 'Role removed successfully from user.',
      },
      FAIL: {
        code: 'ROLE_REMOVE_FAILED',
        message: 'Failed to remove role from user.',
      }
    },
    NOTFOUND: {
      code: 'USER_NOT_FOUND',
      message: 'User not found',
    }
  },
  ROLE: {
    FETCH_SUCCESS: {
      code: 'ROLES_FETCHED',
      message: 'Roles fetched successfully.',
    },
    CREATE: {
      code: 'ROLE_CREATED',
      message: 'Role created Successfully',
    },
    DELETE: {
      SUCCESS: {
        code: 'ROLE_DELETED',
        message: 'Role deleted successfully',
      },
      fail: {
        code: 'ROLE_DELETE_FAILED',
        message: "Role failed to delete"
      }
    },
    NOTFOUND: {
      code: 'ROLE_NOT_FOUND',
      message: 'Role not found',
    },
    UPDATED: {
      code: 'ROLE_UPDATED',
      message: 'Role updated successfully'
    }

  },
} as const;

// PROFILE_FETCHED: {
//   code: 'USER_PROFILE_FETCHED',
//   message: 'User profile retrieved successfully.',
// },
