"use server";

import { completeCoordinatorRegistration } from "@/lib/services/registration";

export async function submitCoordinatorRegistrationAction(
  token: string,
  data: {
    name: string;
    email: string;
    password: string;
    cpf?: string;
    rg?: string;
    address?: string;
    cep?: string;
    zone?: string;
    section?: string;
    voterTitle?: string;
  }
) {
  return completeCoordinatorRegistration({
    token,
    name: data.name,
    email: data.email,
    password: data.password,
    cpf: data.cpf,
    rg: data.rg,
    address: data.address,
    cep: data.cep,
    zone: data.zone,
    section: data.section,
    voterTitle: data.voterTitle,
  });
}
