import { useAuthStore } from "@/store/auth.store";

export function usePermissions() {
  const user = useAuthStore((state) => state.user);

  const userRole = user?.role?.toLowerCase();
  const isAdmin =
    userRole === "admin" ||
    userRole === "owner" ||
    user?.permissions?.includes("admin") ||
    user?.permissions?.includes("all");

  const hasPermission = (permission: string | string[]) => {
    if (!user) return false;
    // Admins and owners bypass individual granular permissions
    if (isAdmin) {
      return true;
    }

    const userPerms = user.permissions || [];
    if (Array.isArray(permission)) {
      return permission.some((p) => userPerms.includes(p));
    }
    return userPerms.includes(permission);
  };

  return {
    hasPermission,
    permissions: user?.permissions || [],
    isAdmin,
    isManager: userRole === "manager" || userRole === "branch_manager",
  };
}
