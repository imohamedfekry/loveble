export enum Permission {
  USER_CREATE = 1 << 0, // 1
  USER_DELETE = 1 << 1, // 2
  USER_READ = 1 << 2, // 4
  USER_MANAGE = 1 << 3, // 8
  USER_ROLE_MANAGE = 1 << 4, // 16
  ROLES_CREATE = 1 << 5, // 32
  ROLES_DELETE = 1 << 6, // 64
  ROLES_READ = 1 << 7, // 128
  ROLES_UPDATE = 1 << 8, // 256
  ROLES_MANAGE = 1 << 9, // 512
}
export const mustHaveToAddPermissionMap: Record<number, number> = {
  [Permission.USER_CREATE]: Permission.USER_CREATE,
  [Permission.USER_DELETE]: Permission.USER_DELETE,
  [Permission.USER_READ]: Permission.USER_READ,
  [Permission.USER_MANAGE]: Permission.USER_MANAGE,
  [Permission.USER_ROLE_MANAGE]: Permission.USER_ROLE_MANAGE,

  [Permission.ROLES_CREATE]: Permission.ROLES_CREATE,
  [Permission.ROLES_DELETE]: Permission.ROLES_DELETE,
  [Permission.ROLES_READ]: Permission.ROLES_READ,
  [Permission.ROLES_UPDATE]: Permission.ROLES_UPDATE,
  [Permission.ROLES_MANAGE]: Permission.ROLES_MANAGE,
};