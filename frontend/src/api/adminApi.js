import { authClient } from './client'

export async function assignRoleToUser(userId, roleId) {
  const { data } = await authClient.post(`/admin/user-role/user/${userId}/role/${roleId}`)
  return data
}

export async function removeRoleFromUser(userId, roleId) {
  const { data } = await authClient.delete(`/admin/user-role/user/${userId}/role/${roleId}`)
  return data
}

export async function assignPermissionToRole(roleId, permissionId) {
  const { data } = await authClient.post(`/admin/rbac/role/${roleId}/permission/${permissionId}`)
  return data
}

export async function removePermissionFromRole(roleId, permissionId) {
  const { data } = await authClient.delete(`/admin/rbac/role/${roleId}/permission/${permissionId}`)
  return data
}
