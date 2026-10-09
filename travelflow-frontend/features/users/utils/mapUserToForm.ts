import type { User } from "@/types";
import type { UserFormValues } from "@/features/users/schemas/user.schema";

export function mapUserToForm(user: User): UserFormValues {
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone ?? "",
    role: user.role,
    branchId: user.branchId ?? "",
    status: user.status,
  };
}

export const userDefaultValues: UserFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "agent",
  branchId: "",
  status: "active",
};
