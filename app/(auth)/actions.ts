"use server";

// TEMPORARY DISABLED AUTH
// NextAuth/Auth.js removed
// Supabase auth will be added next

export type LoginActionState = {
  status: "idle" | "success";
};

export const login = async (): Promise<LoginActionState> => {
  return { status: "success" };
};

export type RegisterActionState = {
  status: "idle" | "success";
};

export const register = async (): Promise<RegisterActionState> => {
  return { status: "success" };
};
